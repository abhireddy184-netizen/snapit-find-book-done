import type Stripe from "stripe";
import { computeBookingAmounts, LATE_CANCEL_FEE_CENTS, PLATFORM_FEE_PERCENT } from "./pricing";
import { getStripe } from "./stripe.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Card holds are placed this long before the job (authorizations expire after ~7 days). */
export const HOLD_LEAD_MS = 2 * 24 * 60 * 60 * 1000;
/** Customers have this long after completion to approve before the charge is captured automatically. */
export const AUTO_CAPTURE_MS = 48 * 60 * 60 * 1000;
/** Customer cancellations inside this window before the start pay the late-cancel fee. */
export const LATE_CANCEL_MS = 24 * 60 * 60 * 1000;

/** The pro's fixed price for this category (or their starting price), in cents. */
export async function getProPriceCents(admin: Admin, providerId: string, categorySlug?: string | null) {
  const { data: services } = await admin
    .from("provider_services")
    .select("category_slug, is_primary, price_cents")
    .eq("user_id", providerId);
  const match =
    services?.find((s) => categorySlug && s.category_slug === categorySlug && s.price_cents) ??
    services?.find((s) => s.is_primary && s.price_cents);
  if (match?.price_cents) return match.price_cents;
  const { data: prof } = await admin.from("provider_profiles").select("starting_price").eq("user_id", providerId).maybeSingle();
  const p = Number(prof?.starting_price);
  return p > 0 ? Math.round(p * 100) : null;
}

export async function getPayoutAccount(admin: Admin, providerId: string) {
  const { data } = await admin
    .from("provider_payout_accounts")
    .select("stripe_account_id, charges_enabled, payouts_enabled")
    .eq("provider_id", providerId)
    .maybeSingle();
  return data?.charges_enabled && data.payouts_enabled ? data.stripe_account_id : null;
}

export async function ensureStripeCustomer(admin: Admin, userId: string, email?: string) {
  const { data } = await admin.from("customer_billing").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (data) return data.stripe_customer_id;
  const c = await getStripe().customers.create({ email, metadata: { user_id: userId } });
  await admin.from("customer_billing").insert({ user_id: userId, stripe_customer_id: c.id });
  return c.id;
}

/** Makes sure the customer has a Customer object on the connected account too (for direct charges). */
export async function ensureConnectedCustomer(admin: Admin, userId: string, platformCustomer: string, stripeAccount: string) {
  const { data } = await admin
    .from("connected_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .eq("stripe_account_id", stripeAccount)
    .maybeSingle();
  if (data) return data.stripe_customer_id;
  const c = await getStripe().customers.create(
    { metadata: { user_id: userId } },
    { stripeAccount, idempotencyKey: `conn-cus-${userId}-${stripeAccount}` },
  );
  await admin.from("connected_customers").insert({ user_id: userId, stripe_account_id: stripeAccount, stripe_customer_id: c.id });
  return c.id;
}

type BookingRow = {
  id: string;
  customer_id: string;
  provider_id: string | null;
  total_cents: number | null;
  service_fee_cents: number | null;
  platform_fee_cents: number | null;
  payment_method_id: string | null;
  payment_status: string;
};

const BOOKING_COLS =
  "id, customer_id, provider_id, total_cents, service_fee_cents, platform_fee_cents, payment_method_id, payment_status";

/** Places the manual-capture hold on the saved card. Never throws. */
export async function placeHold(admin: Admin, b: BookingRow): Promise<boolean> {
  try {
    if (!b.provider_id || !b.payment_method_id || !b.total_cents) throw new Error("Booking is missing payment details");
    const acct = await getPayoutAccount(admin, b.provider_id);
    if (!acct) throw new Error("Pro payouts are not active");
    const stripe = getStripe();
    const platformCustomer = await ensureStripeCustomer(admin, b.customer_id);
    const connCus = await ensureConnectedCustomer(admin, b.customer_id, platformCustomer, acct);
    const cloned = await stripe.paymentMethods.create(
      { customer: platformCustomer, payment_method: b.payment_method_id },
      { stripeAccount: acct },
    );
    await stripe.paymentMethods.attach(cloned.id, { customer: connCus }, { stripeAccount: acct });
    const fee = (b.platform_fee_cents ?? 0) + (b.service_fee_cents ?? 0);
    const pi = await stripe.paymentIntents.create(
      {
        amount: b.total_cents,
        currency: "usd",
        customer: connCus,
        payment_method: cloned.id,
        capture_method: "manual",
        off_session: true,
        confirm: true,
        application_fee_amount: fee,
        metadata: { booking_id: b.id, kind: "full" },
      },
      { stripeAccount: acct, idempotencyKey: `hold-${b.id}-${b.payment_method_id}` },
    );
    await admin.from("payments").upsert(
      {
        booking_id: b.id,
        kind: "full",
        payment_intent_id: pi.id,
        amount_cents: b.total_cents,
        fee_cents: fee,
        status: pi.status,
        connected_account_id: acct,
      },
      { onConflict: "payment_intent_id" },
    );
    const ok = pi.status === "requires_capture";
    await admin
      .from("bookings")
      .update({ payment_status: ok ? "authorized" : "failed", payment_action_needed: !ok, hold_scheduled_at: null })
      .eq("id", b.id);
    if (!ok) await notifyHoldFailed(admin, b.id);
    return ok;
  } catch (err) {
    console.error("[payments] hold failed", b.id, err instanceof Error ? err.message : err);
    await admin.from("bookings").update({ payment_status: "failed", payment_action_needed: true, hold_scheduled_at: null }).eq("id", b.id);
    await notifyHoldFailed(admin, b.id);
    return false;
  }
}

/** Emails the pro and the owner that a card hold failed. Never throws. */
async function notifyHoldFailed(admin: Admin, bookingId: string) {
  try {
    const { data: b } = await admin
      .from("bookings")
      .select("id, provider_id, service, service_address, service_zip, scheduled_date, scheduled_time, provider_name_snapshot")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b) return;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const when = `${b.scheduled_date} ${b.scheduled_time}`;
    await sendTemplateEmail("internal-lead", "", {
      templateData: {
        leadType: "booking",
        service: b.service,
        businessName: `Card hold FAILED — ${b.provider_name_snapshot ?? "pro"}`,
        location: b.service_address,
        zip: b.service_zip,
        note: `${when} — customer asked to update their card`,
        source: "payments (card hold failed)",
        submittedAt: new Date().toISOString(),
      },
      idempotencyKey: `hold-failed-owner-${b.id}-${Date.now()}`,
    }).catch((e) => console.error("[payments] owner alert failed", e instanceof Error ? e.message : e));
    if (b.provider_id) {
      const { data: u } = await admin.auth.admin.getUserById(b.provider_id);
      const email = u?.user?.email;
      if (email) {
        await sendTemplateEmail("payment-alert", email, {
          templateData: { service: b.service, when },
          idempotencyKey: `hold-failed-pro-${b.id}-${Date.now()}`,
        }).catch((e) => console.error("[payments] pro alert failed", e instanceof Error ? e.message : e));
      }
    }
  } catch (err) {
    console.error("[payments] hold-failed alert error", err instanceof Error ? err.message : err);
  }
}

/** A card can be (re)saved while the booking is pending, or after a failed hold on a confirmed booking. */
export function canSaveCard(status: string, paymentStatus: string) {
  return (
    (status === "pending" && ["unpaid", "failed", "method_saved"].includes(paymentStatus)) ||
    (status === "confirmed" && paymentStatus === "failed")
  );
}

/**
 * Records a saved card, guarded so it never overwrites an authorized, captured or refunded booking.
 * For a confirmed booking whose hold failed, the hold is re-queued; pass retry=true to place it now.
 */
export async function recordSavedCard(admin: Admin, bookingId: string, paymentMethodId: string, retry: boolean) {
  const b = await loadBooking(admin, bookingId);
  if (!b || !canSaveCard(b.status, b.payment_status)) return false;
  const requeue = b.status === "confirmed";
  const { data: row } = await admin
    .from("bookings")
    .update({
      payment_method_id: paymentMethodId,
      payment_status: "method_saved",
      payment_action_needed: false,
      ...(requeue ? { hold_scheduled_at: new Date().toISOString() } : {}),
    })
    .eq("id", bookingId)
    .eq("status", b.status as never)
    .eq("payment_status", b.payment_status as never)
    .select(BOOKING_COLS)
    .maybeSingle();
  if (!row) return false;
  if (requeue && retry) await placeHold(admin, row as BookingRow);
  return true;
}

async function heldPayment(admin: Admin, bookingId: string) {
  const { data } = await admin
    .from("payments")
    .select("id, payment_intent_id, amount_cents, connected_account_id")
    .eq("booking_id", bookingId)
    .eq("kind", "full")
    .eq("status", "requires_capture")
    .maybeSingle();
  return data;
}

export async function captureBooking(admin: Admin, bookingId: string, approved: boolean) {
  const p = await heldPayment(admin, bookingId);
  if (!p?.payment_intent_id) return { ok: false as const, message: "There's no card hold to charge for this job." };
  try {
    const pi = await getStripe().paymentIntents.capture(
      p.payment_intent_id,
      {},
      { idempotencyKey: `capture-${bookingId}`, ...(p.connected_account_id ? { stripeAccount: p.connected_account_id } : {}) },
    );
    await admin.from("payments").update({ status: pi.status, updated_at: new Date().toISOString() }).eq("id", p.id);
    await admin
      .from("bookings")
      .update({
        payment_status: "captured",
        payment_action_needed: false,
        ...(approved ? { customer_approved_at: new Date().toISOString() } : {}),
      })
      .eq("id", bookingId);
    return { ok: true as const };
  } catch (err) {
    console.error("[payments] capture failed", bookingId, err instanceof Error ? err.message : err);
    // Flag for review; the hourly run skips flagged bookings so it doesn't retry forever.
    await admin.from("bookings").update({ payment_action_needed: true }).eq("id", bookingId);
    return { ok: false as const, message: "We couldn't complete the payment. Please try again shortly." };
  }
}

/** Releases the hold, or keeps only the late-cancel fee from it. */
export async function settleCancellation(admin: Admin, bookingId: string, chargeLateFee: boolean) {
  const p = await heldPayment(admin, bookingId);
  const stripe = getStripe();
  try {
    if (!p?.payment_intent_id) {
      await admin.from("bookings").update({ payment_status: "canceled", payment_action_needed: false, hold_scheduled_at: null }).eq("id", bookingId);
      return;
    }
    const opts = p.connected_account_id ? { stripeAccount: p.connected_account_id } : undefined;
    if (chargeLateFee) {
      const amount = Math.min(LATE_CANCEL_FEE_CENTS, p.amount_cents);
      const pi = await stripe.paymentIntents.capture(
        p.payment_intent_id,
        { amount_to_capture: amount, application_fee_amount: Math.round((amount * PLATFORM_FEE_PERCENT) / 100) },
        opts,
      );
      await admin.from("payments").update({ kind: "cancellation_fee", amount_cents: amount, status: pi.status }).eq("id", p.id);
      await admin.from("bookings").update({ payment_status: "captured", hold_scheduled_at: null }).eq("id", bookingId);
    } else {
      const pi = await stripe.paymentIntents.cancel(p.payment_intent_id, undefined, opts);
      await admin.from("payments").update({ status: pi.status }).eq("id", p.id);
      await admin.from("bookings").update({ payment_status: "canceled", hold_scheduled_at: null }).eq("id", bookingId);
    }
  } catch (err) {
    console.error("[payments] cancellation settle failed", bookingId, err instanceof Error ? err.message : err);
  }
}

/** Runs holds and automatic captures that are due. Safe to call repeatedly. */
export async function processDuePayments(admin: Admin, opts: { userId?: string } = {}) {
  const now = new Date().toISOString();
  let holds = admin
    .from("bookings")
    .select(BOOKING_COLS)
    .eq("status", "confirmed")
    .eq("payment_status", "method_saved")
    .lte("hold_scheduled_at", now)
    .limit(25);
  let captures = admin
    .from("bookings")
    .select("id")
    .eq("status", "completed")
    .eq("payment_status", "authorized")
    .eq("payment_action_needed", false)
    .lte("auto_capture_at", now)
    .limit(25);
  if (opts.userId) {
    const f = `customer_id.eq.${opts.userId},provider_id.eq.${opts.userId}`;
    holds = holds.or(f);
    captures = captures.or(f);
  }
  const [{ data: h }, { data: c }] = await Promise.all([holds, captures]);
  for (const b of h ?? []) await placeHold(admin, b as BookingRow);
  for (const b of c ?? []) await captureBooking(admin, b.id, false);
  await flagStaleHolds(admin);
  return { holds: h?.length ?? 0, captures: c?.length ?? 0 };
}

/** Card holds expire after ~7 days: flag bookings whose hold is over 6 days old and the job isn't done. */
export const STALE_HOLD_MS = 6 * 24 * 60 * 60 * 1000;
async function flagStaleHolds(admin: Admin) {
  const cutoff = new Date(Date.now() - STALE_HOLD_MS).toISOString();
  const { data: old } = await admin
    .from("payments")
    .select("booking_id")
    .eq("kind", "full")
    .eq("status", "requires_capture")
    .lt("created_at", cutoff)
    .limit(100);
  const ids = [...new Set((old ?? []).map((p) => p.booking_id))];
  if (!ids.length) return;
  await admin
    .from("bookings")
    .update({ payment_action_needed: true })
    .in("id", ids)
    .in("status", ["confirmed", "in_progress"])
    .eq("payment_action_needed", false);
}

export async function loadBooking(admin: Admin, id: string) {
  const { data } = await admin.from("bookings").select(`${BOOKING_COLS}, status, start_at, category_slug`).eq("id", id).maybeSingle();
  return data as (BookingRow & { status: string; start_at: string | null; category_slug: string | null }) | null;
}

export { computeBookingAmounts };
export type { Stripe };
