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
    const dest = await getPayoutAccount(admin, b.provider_id);
    if (!dest) throw new Error("Pro payouts are not active");
    const customer = await ensureStripeCustomer(admin, b.customer_id);
    const fee = (b.platform_fee_cents ?? 0) + (b.service_fee_cents ?? 0);
    const pi = await getStripe().paymentIntents.create(
      {
        amount: b.total_cents,
        currency: "usd",
        customer,
        payment_method: b.payment_method_id,
        capture_method: "manual",
        off_session: true,
        confirm: true,
        application_fee_amount: fee,
        transfer_data: { destination: dest },
        metadata: { booking_id: b.id, kind: "full" },
      },
      { idempotencyKey: `hold-${b.id}` },
    );
    await admin.from("payments").upsert(
      { booking_id: b.id, kind: "full", payment_intent_id: pi.id, amount_cents: b.total_cents, fee_cents: fee, status: pi.status },
      { onConflict: "payment_intent_id" },
    );
    const ok = pi.status === "requires_capture";
    await admin
      .from("bookings")
      .update({ payment_status: ok ? "authorized" : "failed", payment_action_needed: !ok, hold_scheduled_at: null })
      .eq("id", b.id);
    return ok;
  } catch (err) {
    console.error("[payments] hold failed", b.id, err instanceof Error ? err.message : err);
    await admin.from("bookings").update({ payment_status: "failed", payment_action_needed: true }).eq("id", b.id);
    return false;
  }
}

async function heldPayment(admin: Admin, bookingId: string) {
  const { data } = await admin
    .from("payments")
    .select("id, payment_intent_id, amount_cents")
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
    const pi = await getStripe().paymentIntents.capture(p.payment_intent_id, {}, { idempotencyKey: `capture-${bookingId}` });
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
    if (chargeLateFee) {
      const amount = Math.min(LATE_CANCEL_FEE_CENTS, p.amount_cents);
      const pi = await stripe.paymentIntents.capture(p.payment_intent_id, {
        amount_to_capture: amount,
        application_fee_amount: Math.round((amount * PLATFORM_FEE_PERCENT) / 100),
      });
      await admin.from("payments").update({ kind: "cancellation_fee", amount_cents: amount, status: pi.status }).eq("id", p.id);
      await admin.from("bookings").update({ payment_status: "captured", hold_scheduled_at: null }).eq("id", bookingId);
    } else {
      const pi = await stripe.paymentIntents.cancel(p.payment_intent_id);
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
  return { holds: h?.length ?? 0, captures: c?.length ?? 0 };
}

export async function loadBooking(admin: Admin, id: string) {
  const { data } = await admin.from("bookings").select(`${BOOKING_COLS}, status, start_at`).eq("id", id).maybeSingle();
  return data as (BookingRow & { status: string; start_at: string | null }) | null;
}

export { computeBookingAmounts };
export type { Stripe };
