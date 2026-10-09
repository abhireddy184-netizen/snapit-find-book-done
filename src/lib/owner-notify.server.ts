// Server-only: durable owner ("internal-lead") alerts to info@getpros.ai.
// Every alert is recorded in owner_notifications under a stable key before sending.
// A failed send stays "failed" and is retried hourly by run-due with the SAME
// idempotency key, so the owner never gets duplicates. Never throws.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const MAX_ATTEMPTS = 6;

async function admin(): Promise<Admin> {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function attempt(db: Admin, key: string, payload: Record<string, unknown>, replyTo: string | null, attempts: number) {
  try {
    const r = await sendTemplateEmail("internal-lead", "", {
      templateData: payload,
      idempotencyKey: key,
      replyTo: replyTo || undefined,
    });
    await db
      .from("owner_notifications")
      .update({ status: r.sent ? "sent" : "suppressed", attempts: attempts + 1, last_error: null, sent_at: new Date().toISOString() })
      .eq("key", key);
    return true;
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    console.error(`[owner-notify] send failed (${key.split("-").slice(0, 2).join("-")}):`, msg);
    await db.from("owner_notifications").update({ status: "failed", attempts: attempts + 1, last_error: msg }).eq("key", key);
    return false;
  }
}

/** Records then sends one owner alert. A key already recorded is never sent again here. */
export async function sendOwnerAlert(
  key: string,
  kind: string,
  payload: Record<string, unknown>,
  replyTo?: string | null,
): Promise<void> {
  try {
    const db = await admin();
    const { error } = await db
      .from("owner_notifications")
      .insert({ key, kind, payload: payload as never, reply_to: replyTo ?? null });
    if (error) {
      if ((error as { code?: string }).code === "23505") return; // already recorded; retries handled hourly
      console.error("[owner-notify] could not record alert:", error.message);
      // Still try to send; the provider-side idempotency key prevents duplicates.
    }
    await attempt(db, key, payload, replyTo ?? null, 0);
  } catch (err) {
    console.error("[owner-notify] unexpected:", err instanceof Error ? err.message : err);
  }
}

/** Builds the owner alert for a new account; returns null if the user is unknown. */
export async function accountAlertPayload(db: Admin, userId: string) {
  const { data: res } = await db.auth.admin.getUserById(userId);
  const user = res?.user;
  if (!user?.created_at) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { data: profile } = await db.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? (meta["role"] as string | undefined) ?? "customer";
  const name = profile?.full_name || (meta["full_name"] as string | undefined) || (meta["name"] as string | undefined) || null;
  return {
    createdAt: user.created_at,
    email: user.email ?? null,
    payload: {
      leadType: "account",
      name,
      email: user.email ?? null,
      service: role === "provider" ? "Service Provider account" : "Customer account",
      source: user.app_metadata?.["provider"] ? `sign-up (${String(user.app_metadata["provider"])})` : "sign-up",
      submittedAt: user.created_at,
    },
  };
}

/**
 * Hourly: retries failed/stuck alerts and backfills alerts for any new account
 * (last 3 days) whose browser never called notifyNewAccount.
 */
export async function processOwnerAlerts(db: Admin) {
  let retried = 0;
  let backfilled = 0;
  // Only backfill accounts created after durable alerts went in, so accounts already
  // alerted by the previous (unrecorded) path are never alerted twice.
  const cutoff = Date.parse("2026-10-09T17:00:00Z");
  const since = new Date(Math.max(cutoff, Date.now() - 3 * 24 * 3600 * 1000)).toISOString();
  const { data: recent } = await db.from("profiles").select("id").gte("created_at", since).limit(500);
  if (recent?.length) {
    const keys = recent.map((p) => `internal-account-${p.id}`);
    const { data: known } = await db.from("owner_notifications").select("key").in("key", keys);
    const have = new Set((known ?? []).map((k) => k.key));
    for (const p of recent) {
      const key = `internal-account-${p.id}`;
      if (have.has(key)) continue;
      const a = await accountAlertPayload(db, p.id);
      if (!a) continue;
      await sendOwnerAlert(key, "account", a.payload, a.email);
      backfilled++;
    }
  }
  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: due } = await db
    .from("owner_notifications")
    .select("key, payload, reply_to, attempts, status, created_at")
    .in("status", ["failed", "pending"])
    .lt("attempts", MAX_ATTEMPTS)
    .lt("created_at", stale)
    .limit(50);
  for (const n of due ?? []) {
    if (await attempt(db, n.key, n.payload as Record<string, unknown>, n.reply_to, n.attempts)) retried++;
  }
  return { retried, backfilled };
}
