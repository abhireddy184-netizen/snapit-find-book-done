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
    // The database function re-checks admin rights and, on a real change to verified,
    // queues the approval email in the same transaction (durable outbox).
    const { error } = await context.supabase.rpc("admin_set_provider_verification", {
      _user_id: data.userId, _status: data.status,
    });
    if (error) return { error: error.message };
    if (data.status === "verified") {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processApprovedEmails } = await import("@/lib/provider-onboarding.server");
        await processApprovedEmails(supabaseAdmin, data.userId); // fast path; hourly job is the safety net
      } catch (err) {
        console.error("[verification] approval email:", err instanceof Error ? err.message : err);
      }
    }
    return { error: null };
  });
