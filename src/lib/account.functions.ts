import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes the signed-in user's own account and data. If anything can't be
 * cleanly removed (e.g. a held/captured payment with FK references), this
 * records an account_deletion_requests row and emails info@getpros.ai instead
 * of leaving the account half-deleted.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; queued?: boolean }> => {
    const userId = context.userId;
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function queueForReview(reason: string) {
      try {
        await supabaseAdmin.from("account_deletion_requests").insert({ user_id: userId, email, status: "pending" });
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("internal-lead", "", {
          templateData: {
            leadType: "booking",
            businessName: `Account deletion needs manual review`,
            note: `User ${userId} (${email ?? "no email"}) requested account deletion but it couldn't complete automatically: ${reason}`,
            source: "account deletion",
            submittedAt: new Date().toISOString(),
          },
          idempotencyKey: `account-deletion-${userId}-${Date.now()}`,
        }).catch((e) => console.error("[account] deletion alert failed", e instanceof Error ? e.message : e));
      } catch (e) {
        console.error("[account] queueForReview failed", e instanceof Error ? e.message : e);
      }
    }

    try {
      // Block deletion if there are held or captured payments that still need resolving.
      const { data: unresolved } = await supabaseAdmin
        .from("bookings")
        .select("id, payment_status")
        .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
        .in("payment_status", ["authorized", "captured", "partially_refunded"]);
      if (unresolved && unresolved.length > 0) {
        await queueForReview("Open bookings have held/captured/partially refunded payments.");
        return { ok: false, queued: true };
      }

      // Delete bookings with no captured/authorized payment, then dependent rows, then the user.
      await supabaseAdmin
        .from("bookings")
        .delete()
        .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
        .not("payment_status", "in", "(authorized,captured,partially_refunded)");

      await supabaseAdmin.from("service_requests").delete().eq("customer_id", userId);
      await supabaseAdmin.from("provider_services").delete().eq("user_id", userId);
      await supabaseAdmin.from("provider_payout_accounts").delete().eq("provider_id", userId);
      await supabaseAdmin.from("provider_profiles").delete().eq("user_id", userId);
      await supabaseAdmin.from("connected_customers").delete().eq("user_id", userId);
      await supabaseAdmin.from("customer_billing").delete().eq("user_id", userId);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) throw new Error(delErr.message);

      return { ok: true };
    } catch (err) {
      console.error("[account] deleteMyAccount failed:", err instanceof Error ? err.message : err);
      await queueForReview(err instanceof Error ? err.message : "Unknown error");
      return { ok: false, queued: true };
    }
  });
