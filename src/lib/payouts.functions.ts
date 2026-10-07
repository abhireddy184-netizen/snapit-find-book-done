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
        const account = await stripe.accounts.create(
          {
            type: "express",
            country: "US",
            email,
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            metadata: { provider_id: context.userId },
          },
          { idempotencyKey: `payout-acct-${context.userId}` },
        );
        await supabaseAdmin
          .from("provider_payout_accounts")
          .upsert({ provider_id: context.userId, stripe_account_id: account.id }, { onConflict: "provider_id", ignoreDuplicates: true });
        const { data: row } = await supabaseAdmin
          .from("provider_payout_accounts")
          .select("stripe_account_id")
          .eq("provider_id", context.userId)
          .maybeSingle();
        accountId = row?.stripe_account_id ?? account.id;
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
    const { getStripe } = await import("./stripe.server");
    const a = await getStripe().accounts.retrieve(row.stripe_account_id);
    await supabaseAdmin
      .from("provider_payout_accounts")
      .update({
        charges_enabled: a.charges_enabled,
        payouts_enabled: a.payouts_enabled,
        details_submitted: a.details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", context.userId);
    return { ok: true };
  });
