import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

/**
 * Stripe Connect webhook for events from connected accounts (direct charges).
 * Verified with STRIPE_CONNECT_WEBHOOK_SECRET. Events are matched to payments by
 * payment_intent_id AND connected_account_id so an event from the wrong account
 * can never touch another pro's payment row. Dedupe reuses the stripe_events table.
 */
export const Route = createFileRoute("/api/public/stripe/connect-webhook")({
  server: {
    handlers: {
      GET: () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }),
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!sig) return new Response("Missing signature", { status: 400 });
        const secret = process.env["STRIPE_CONNECT_WEBHOOK_SECRET"];
        if (!secret) {
          console.error("[stripe-connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET is not configured");
          return new Response("Webhook not configured", { status: 500 });
        }
        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();
        let event: Stripe.Event | null = null;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        } catch {
          /* invalid signature */
        }
        if (!event) return new Response("Invalid signature", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: dup } = await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
        if (dup) {
          if ((dup as { code?: string }).code === "23505") return new Response("ok"); // already processed
          console.error("[stripe-connect-webhook] event log failed:", dup.message);
          return new Response("Event log error", { status: 500 });
        }

        try {
          await handleEvent(event, supabaseAdmin);
        } catch (err) {
          console.error("[stripe-connect-webhook]", event.type, err instanceof Error ? err.message : err);
          await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
          return new Response("Handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Order of booking payment states; updates only ever move forward. */
const RANK: Record<string, number> = {
  unpaid: 0, method_saved: 1, failed: 1.5, authorized: 2, canceled: 3, captured: 3, partially_refunded: 4, refunded: 5,
};
const PI_RANK: Record<string, number> = { requires_capture: 1, failed: 1, canceled: 2, succeeded: 2 };

async function setPayment(admin: Admin, pi: Stripe.PaymentIntent, account: string, status: string, bookingStatus?: string) {
  // Ignore payment intents we didn't create, and never cross accounts.
  const { data: pay } = await admin
    .from("payments")
    .select("id, booking_id, status")
    .eq("payment_intent_id", pi.id)
    .eq("connected_account_id", account)
    .maybeSingle();
  if (!pay) return;
  if ((PI_RANK[status] ?? 0) > (PI_RANK[pay.status] ?? 0)) {
    await admin.from("payments").update({ status, updated_at: new Date().toISOString() }).eq("id", pay.id);
  }
  if (!bookingStatus) return;
  const { data: b } = await admin.from("bookings").select("payment_status").eq("id", pay.booking_id).maybeSingle();
  if (!b || (RANK[bookingStatus] ?? 0) <= (RANK[b.payment_status] ?? 0)) return;
  await admin
    .from("bookings")
    .update({ payment_status: bookingStatus as never, payment_action_needed: bookingStatus === "failed" })
    .eq("id", pay.booking_id)
    .eq("payment_status", b.payment_status);
}

async function handleEvent(event: Stripe.Event, admin: Admin) {
  if (event.type === "account.updated") {
    // Connected-account context: event.account is the pro's account; the object is
    // that same Account. Readiness is re-read from Stripe in the shared helper.
    const obj = event.data.object as Stripe.Account;
    const { syncPayoutAccount } = await import("@/lib/payout-sync.server");
    const r = await syncPayoutAccount(admin, event.account ?? obj.id);
    console.log("[stripe-connect-webhook] account.updated", event.id, r);
    return;
  }
  const account = event.account;
  if (!account) return; // not a connect event, nothing to do here

  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, account, "requires_capture", "authorized");
      break;
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setPayment(admin, pi, account, "succeeded", pi.metadata?.kind === "cancellation_fee" ? undefined : "captured");
      break;
    }
    case "payment_intent.payment_failed":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, account, "failed", "failed");
      break;
    case "payment_intent.canceled":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, account, "canceled", "canceled");
      break;
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      if (!pi) break;
      const { data: p } = await admin
        .from("payments")
        .select("booking_id")
        .eq("payment_intent_id", pi)
        .eq("connected_account_id", account)
        .maybeSingle();
      if (p) {
        await admin
          .from("bookings")
          .update({ payment_status: ch.amount_refunded >= ch.amount ? "refunded" : "partially_refunded" })
          .eq("id", p.booking_id);
      }
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.closed":
      console.log("[stripe-connect-webhook] recorded", event.type, event.id, "account:", account);
      break;
    default:
      break;
  }
}
