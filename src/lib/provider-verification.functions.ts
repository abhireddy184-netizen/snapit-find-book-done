import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["unverified", "pending", "verified"]),
});

/** Admin-only: change a pro's verification status; sends the approval email on a real change to verified. */
export const adminSetProviderVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }): Promise<{ error: string | null }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) return { error: "Only admins can change verification." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("provider_profiles").select("verification_status").eq("user_id", data.userId).maybeSingle();
    // The database function re-checks admin rights as the signed-in caller.
    const { error } = await context.supabase.rpc("admin_set_provider_verification", {
      _user_id: data.userId, _status: data.status,
    });
    if (error) return { error: error.message };
    const { shouldSendApprovedEmail } = await import("@/lib/provider-onboarding-rules");
    if (shouldSendApprovedEmail(process.env["PROVIDER_APPROVED_EMAIL_ENABLED"], before?.verification_status, data.status)) {
      const { sendProviderApproved } = await import("@/lib/provider-onboarding.server");
      await sendProviderApproved(supabaseAdmin, data.userId);
    }
    return { error: null };
  });
