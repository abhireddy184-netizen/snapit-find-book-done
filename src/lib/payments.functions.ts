import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBookingAmounts } from "./pricing";

type Amounts = ReturnType<typeof computeBookingAmounts>;

/** Price + whether this pro can take paid bookings right now. */
export const getBookingQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ providerId: z.string().uuid(), categorySlug: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; amounts: Amounts } | { ok: false; message: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPayoutAccount, getProPriceCents } = await import("./payments.server");
    if (!(await getPayoutAccount(supabaseAdmin, data.providerId))) {
      return { ok: false, message: "This pro hasn't finished setting up payments yet, so they can't take bookings right now." };
    }
    const price = await getProPriceCents(supabaseAdmin, data.providerId, data.categorySlug);
    if (!price) return { ok: false, message: "This pro hasn't set a price yet, so they can't take bookings right now." };
    return { ok: true, amounts: computeBookingAmounts(price) };
  });

/** Locks the price on the customer's pending booking and opens card setup. */
export const startBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ bookingId: z.string().uuid(), categorySlug: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string; publishableKey: string; amounts: Amounts } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const p = await import("./payments.server");
      const b = await p.loadBooking(supabaseAdmin, data.bookingId);
      if (!b || b.customer_id !== context.userId) return { error: "We couldn't find that booking." };
      if (b.status !== "pending" || !["unpaid", "failed", "method_saved"].includes(b.payment_status)) {
        return { error: "This booking's payment is already set up." };
      }
      if (!b.provider_id || !(await p.getPayoutAccount(supabaseAdmin, b.provider_id))) {
        return { error: "This pro can't take paid bookings right now." };
      }
      const price = await p.getProPriceCents(supabaseAdmin, b.provider_id, data.categorySlug);
      if (!price) return { error: "This pro hasn't set a price yet." };
      const amounts = computeBookingAmounts(price);
      await supabaseAdmin
        .from("bookings")
        .update({
          subtotal_cents: amounts.subtotal_cents,
          service_fee_cents: amounts.service_fee_cents,
          platform_fee_cents: amounts.platform_fee_cents,
          total_cents: amounts.total_cents,
          currency: "usd",
        })
        .eq("id", b.id);
      const email = (context.claims as { email?: string } | undefined)?.email;
      const customer = await p.ensureStripeCustomer(supabaseAdmin, context.userId, email);
      const { getStripe } = await import("./stripe.server");
      const si = await getStripe().setupIntents.create({
        customer,
        usage: "off_session",
        metadata: { booking_id: b.id },
      });
      return { clientSecret: si.client_secret!, publishableKey: process.env["STRIPE_PUBLISHABLE_KEY"] ?? "", amounts };
    } catch (err) {
      console.error("[payments] start failed:", err instanceof Error ? err.message : err);
      return { error: "We couldn't open the card form right now. Please try again." };
    }
  });

/** Records the saved card right away (the webhook does the same, as a backup). */
export const confirmCardSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid(), setupIntentId: z.string().max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("./stripe.server");
    const si = await getStripe().setupIntents.retrieve(data.setupIntentId);
    const { data: b } = await supabaseAdmin.from("bookings").select("customer_id").eq("id", data.bookingId).maybeSingle();
    if (!b || b.customer_id !== context.userId || si.metadata?.["booking_id"] !== data.bookingId || si.status !== "succeeded") {
      return { ok: false };
    }
    await supabaseAdmin
      .from("bookings")
      .update({ payment_method_id: String(si.payment_method), payment_status: "method_saved", payment_action_needed: false })
      .eq("id", data.bookingId);
    return { ok: true };
  });

/** Customer approves finished work: charge the held amount now. */
export const approveAndPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = await import("./payments.server");
    const b = await p.loadBooking(supabaseAdmin, data.bookingId);
    if (!b || b.customer_id !== context.userId) return { ok: false as const, message: "We couldn't find that booking." };
    if (b.status !== "completed" || b.payment_status !== "authorized") {
      return { ok: false as const, message: "This job isn't ready for payment." };
    }
    return p.captureBooking(supabaseAdmin, b.id, true);
  });

/** Runs any due holds/captures for the signed-in user's bookings. */
export const syncMyPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { processDuePayments } = await import("./payments.server");
      return await processDuePayments(supabaseAdmin, { userId: context.userId });
    } catch (err) {
      console.error("[payments] sync failed:", err instanceof Error ? err.message : err);
      return { holds: 0, captures: 0 };
    }
  });

/** Admin-only refund (full by default). Reverses the pro transfer and GetPros fee proportionally. */
export const adminRefundBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        amountCents: z.number().int().positive().optional(),
        reason: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; refunded: number } | { ok: false; message: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false, message: "Admins only." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pay } = await supabaseAdmin
      .from("payments")
      .select("id, payment_intent_id, amount_cents")
      .eq("booking_id", data.bookingId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pay?.payment_intent_id) return { ok: false, message: "No completed payment found for that booking." };
    const amount = Math.min(data.amountCents ?? pay.amount_cents, pay.amount_cents);
    try {
      const { getStripe } = await import("./stripe.server");
      const r = await getStripe().refunds.create({
        payment_intent: pay.payment_intent_id,
        amount,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: { booking_id: data.bookingId },
      });
      await supabaseAdmin.from("refunds").insert({
        payment_id: pay.id,
        booking_id: data.bookingId,
        stripe_refund_id: r.id,
        amount_cents: amount,
        reason: data.reason ?? null,
        status: r.status ?? "pending",
        created_by: context.userId,
      });
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: amount >= pay.amount_cents ? "refunded" : "partially_refunded" })
        .eq("id", data.bookingId);
      return { ok: true, refunded: amount };
    } catch (err) {
      console.error("[payments] refund failed:", err instanceof Error ? err.message : err);
      return { ok: false, message: "Stripe couldn't process that refund." };
    }
  });
