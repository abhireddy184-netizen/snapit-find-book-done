import { createServerFn } from "@tanstack/react-start";

/**
 * Public, read-only check for whether pros are actually able to accept a paid
 * booking right now: GetPros-verified, accepting work, AND their Stripe
 * Connect payouts are live (charges_enabled + payouts_enabled). The payout
 * table is service-role only, so this loads supabaseAdmin inside the handler
 * and returns only the provider ids that qualify — never account numbers,
 * balances or any other private payout data.
 */
export const fetchBookableProviderIds = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: eligible } = await supabaseAdmin
      .from("provider_profiles")
      .select("user_id")
      .eq("verification_status", "verified")
      .eq("accepting_bookings", true);
    const ids = (eligible ?? []).map((p) => p.user_id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];

    const { data: payouts } = await supabaseAdmin
      .from("provider_payout_accounts")
      .select("provider_id, charges_enabled, payouts_enabled")
      .in("provider_id", ids)
      .eq("charges_enabled", true)
      .eq("payouts_enabled", true);

    return (payouts ?? []).map((p) => p.provider_id);
  },
);
