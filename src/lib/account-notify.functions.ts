import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Sends the owner a "new account" alert. Public (a new email sign-up has no
 * session yet), so the server verifies the account really exists and was
 * created in the last 30 minutes; the idempotency key sends at most one alert
 * per account. Never throws to the caller.
 */
export const notifyNewAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: res, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      const user = res?.user;
      if (error || !user?.created_at) return { ok: false };
      if (Date.now() - new Date(user.created_at).getTime() > 30 * 60 * 1000) return { ok: false };

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      const role = (profile as { role?: string } | null)?.role ?? (meta["role"] as string | undefined) ?? "customer";
      const name =
        (profile as { full_name?: string } | null)?.full_name ??
        (meta["full_name"] as string | undefined) ??
        (meta["name"] as string | undefined) ??
        null;

      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("internal-lead", "", {
        templateData: {
          leadType: "account",
          name,
          email: user.email ?? null,
          service: role === "provider" ? "Service Provider account" : "Customer account",
          source: user.app_metadata?.["provider"] ? `sign-up (${String(user.app_metadata["provider"])})` : "sign-up",
          submittedAt: user.created_at,
        },
        idempotencyKey: `internal-account-${user.id}`,
        replyTo: user.email || undefined,
      });
      return { ok: true };
    } catch (err) {
      console.error("[account-notify] New account notification failed:", err);
      return { ok: false };
    }
  });
