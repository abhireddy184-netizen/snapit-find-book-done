// Server-only: the single source of truth for a pro's payout readiness.
// Always re-reads the account from Stripe (never trusts an event payload), then
// updates the matching provider_payout_accounts row by stripe_account_id.
// Idempotent: repeated calls write the same values.
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function syncPayoutAccount(admin: Admin, stripeAccountId: string): Promise<"updated" | "unknown"> {
  if (!/^acct_[A-Za-z0-9]+$/.test(stripeAccountId)) return "unknown";
  const { data: row } = await admin
    .from("provider_payout_accounts")
    .select("provider_id")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();
  if (!row) return "unknown"; // not one of our pros (or the platform itself)
  const { getStripe } = await import("@/lib/stripe.server");
  const a = await getStripe().accounts.retrieve(stripeAccountId);
  const { error } = await admin
    .from("provider_payout_accounts")
    .update({
      charges_enabled: Boolean(a.charges_enabled),
      payouts_enabled: Boolean(a.payouts_enabled),
      details_submitted: Boolean(a.details_submitted),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId);
  if (error) throw new Error(`payout account update failed: ${error.message}`);
  return "updated";
}
