import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

/**
 * Stripe webhook. Accepts events signed with either the platform secret
 * (STRIPE_WEBHOOK_SECRET) or the Connect secret (STRIPE_CONNECT_WEBHOOK_SECRET).
 * Each event id is recorded once in stripe_events so retries are ignored.
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      GET: () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }),
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!sig) return new Response("Missing signature", { status: 400 });
        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();
        const secrets = [process.env["STRIPE_WEBHOOK_SECRET"], process.env["STRIPE_CONNECT_WEBHOOK_SECRET"]].filter(
          (s): s is string => Boolean(s),
        );
        let event: Stripe.Event | null = null;
        for (const secret of secrets) {
          try {
            event = await stripe.webhooks.constructEventAsync(body, sig, secret);
            break;
          } catch {
            /* try next secret */
          }
        }
        if (!event) return new Response("Invalid signature", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: dup } = await supabaseAdmin.from("stripe_events").insert({ id: event.id, type: event.type });
        if (dup) {
          if ((dup as { code?: string }).code === "23505") return new Response("ok"); // already processed
          console.error("[stripe-webhook] event log failed:", dup.message);
          return new Response("Event log error", { status: 500 });
        }

        try {
          await handleEvent(event, supabaseAdmin);
        } catch (err) {
          console.error("[stripe-webhook]", event.type, err instanceof Error ? err.message : err);
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

async function setPayment(admin: Admin, pi: Stripe.PaymentIntent, status: string, bookingStatus?: string) {
  // Ignore payment intents we didn't create.
  const { data: pay } = await admin.from("payments").select("id, booking_id, status").eq("payment_intent_id", pi.id).maybeSingle();
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
  switch (event.type) {
    case "account.updated": {
      const a = event.data.object as Stripe.Account;
      const { syncPayoutAccount } = await import("@/lib/payout-sync.server");
      const r = await syncPayoutAccount(admin, event.account ?? a.id);
      console.log("[stripe-webhook] account.updated", event.id, r);
      break;
    }
    case "setup_intent.succeeded": {
      const si = event.data.object as Stripe.SetupIntent;
      const bookingId = si.metadata?.booking_id;
      if (bookingId && typeof si.payment_method === "string") {
        // Guarded: never overwrites an authorized, captured or refunded booking. A re-queued hold runs hourly.
        const { recordSavedCard } = await import("@/lib/payments.server");
        await recordSavedCard(admin, bookingId, si.payment_method, false);
      }
      break;
    }
    case "payment_intent.amount_capturable_updated":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, "requires_capture", "authorized");
      break;
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await setPayment(admin, pi, "succeeded", pi.metadata?.kind === "cancellation_fee" ? undefined : "captured");
      break;
    }
    case "payment_intent.payment_failed":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, "failed", "failed");
      break;
    case "payment_intent.canceled":
      await setPayment(admin, event.data.object as Stripe.PaymentIntent, "canceled", "canceled");
      break;
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id;
      if (!pi) break;
      const { data: p } = await admin.from("payments").select("booking_id").eq("payment_intent_id", pi).maybeSingle();
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
    case "payout.paid":
    case "payout.failed":
      console.log("[stripe-webhook] recorded", event.type, event.id);
      break;
    default:
      break;
  }
}
