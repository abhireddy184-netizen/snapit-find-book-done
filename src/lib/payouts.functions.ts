import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Starts (or resumes) Stripe Connect Express onboarding for the signed-in pro. */
export const startPayoutOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string } | { error: string }> => {
    try {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("is_provider, role")
        .eq("id", context.userId)
        .maybeSingle();
      if (!profile || !(profile.is_provider || profile.role === "provider")) {
        return { error: "Only service providers can set up payouts." };
      }
      const { getStripe, siteOrigin } = await import("./stripe.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = getStripe();
      const { data: existing } = await supabaseAdmin
        .from("provider_payout_accounts")
        .select("stripe_account_id")
        .eq("provider_id", context.userId)
        .maybeSingle();
      let accountId = existing?.stripe_account_id;
      if (!accountId) {
        const email = (context.claims as { email?: string } | undefined)?.email;
        // This platform uses Stripe-managed risk (losses collected by Stripe), which
        // Stripe only allows via Accounts v2 with a full Stripe dashboard.
        const account = await stripe.v2.core.accounts.create(
          {
            contact_email: email,
            dashboard: "full",
            identity: { country: "us" },
            configuration: {
              merchant: { capabilities: { card_payments: { requested: true } } },
              recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
            },
            defaults: { responsibilities: { losses_collector: "stripe", fees_collector: "stripe" } },
            metadata: { provider_id: context.userId },
          },
          { idempotencyKey: `payout-acct-${context.userId}` },
        );
        accountId = account.id;
      }
      if (!existing?.stripe_account_id) {
        await supabaseAdmin
          .from("provider_payout_accounts")
          .upsert({ provider_id: context.userId, stripe_account_id: accountId }, { onConflict: "provider_id", ignoreDuplicates: true });
        const { data: row } = await supabaseAdmin
          .from("provider_payout_accounts")
          .select("stripe_account_id")
          .eq("provider_id", context.userId)
          .maybeSingle();
        accountId = row?.stripe_account_id ?? accountId;
      }
      const origin = siteOrigin(getRequest());
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        return_url: `${origin}/provider-dashboard?payouts=return`,
        refresh_url: `${origin}/provider-dashboard?payouts=refresh`,
      });
      return { url: link.url };
    } catch (err) {
      console.error("[payouts] onboarding failed:", err instanceof Error ? err.message : err);
      return { error: "We couldn't open payout setup right now. Please try again." };
    }
  });

/** Refreshes the pro's payout status straight from Stripe (used on return from onboarding). */
export const refreshPayoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("provider_payout_accounts")
      .select("stripe_account_id")
      .eq("provider_id", context.userId)
      .maybeSingle();
    if (!row) return { ok: false };
    const { syncPayoutAccount } = await import("@/lib/payout-sync.server");
    await syncPayoutAccount(supabaseAdmin, row.stripe_account_id);
    return { ok: true };
  });
