import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Sends the owner a "new account" alert. Public (a new email sign-up has no
 * session yet), so the server verifies the account really exists and was
 * created in the last 30 minutes. Recorded under a per-account key: at most one
 * alert per account; failures are retried hourly, and accounts whose browser
 * never called this are backfilled hourly. Never throws to the caller.
 */
export const notifyNewAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { accountAlertPayload, sendOwnerAlert } = await import("@/lib/owner-notify.server");
      const a = await accountAlertPayload(supabaseAdmin, data.userId);
      if (!a) return { ok: false };
      if (Date.now() - new Date(a.createdAt).getTime() > 30 * 60 * 1000) return { ok: false };
      await sendOwnerAlert(`internal-account-${data.userId}`, "account", a.payload, a.email);
      return { ok: true };
    } catch (err) {
      console.error("[account-notify] New account notification failed:", err instanceof Error ? err.message : err);
      return { ok: false };
    }
  });
