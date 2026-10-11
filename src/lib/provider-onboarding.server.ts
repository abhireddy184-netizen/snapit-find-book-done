// Server-only: provider onboarding emails (welcome once verified, reminders at 24h and 48h after signup)
// and the two reminders (24h, 48h after signup) and the one-time "profile completed" owner alert. Every provider email is
// recorded in provider_onboarding_emails (PK user_id+kind) before sending, so it
// is sent at most once; failures are retried hourly by run-due. Never throws.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { SITE_URL } from "@/lib/brand";
import { isOnboardingEligible, isProfileComplete, dueReminders, ONBOARDING_CUTOFF } from "./provider-onboarding-rules";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type Kind = "welcome" | "reminder_24h" | "reminder_48h";
const MAX_ATTEMPTS = 6;

async function loadState(db: Admin, userId: string) {
  const { data: res } = await db.auth.admin.getUserById(userId);
  const user = res?.user;
  if (!user?.email) return null;
  const [{ data: profile }, { data: pp }, { data: del }] = await Promise.all([
    db.from("profiles").select("full_name, role, is_provider").eq("id", userId).maybeSingle(),
    db.from("provider_profiles").select("business_name, service_category, service_zip").eq("user_id", userId).maybeSingle(),
    db.from("account_deletion_requests").select("id").eq("user_id", userId).limit(1),
  ]);
  if (!profile || !(profile.is_provider || profile.role === "provider")) return null;
  const eligible = isOnboardingEligible({
    created_at: user.created_at,
    email_confirmed_at: user.email_confirmed_at ?? null,
    deleted: Boolean(del?.length),
  });
  return {
    email: user.email,
    confirmedAt: user.email_confirmed_at ?? null,
    signupAt: user.created_at,
    firstName: (profile.full_name || "").trim().split(/\s+/)[0] || undefined,
    eligible,
    complete: isProfileComplete(pp),
  };
}

async function sendOnce(db: Admin, userId: string, kind: Kind, email: string, name?: string) {
  const { error } = await db.from("provider_onboarding_emails").insert({ user_id: userId, kind });
  let attempts = 0;
  if (error) {
    if ((error as { code?: string }).code !== "23505") {
      console.error("[provider-onboarding] could not record:", error.message);
      return; // never send unrecorded
    }
    const { data: row } = await db
      .from("provider_onboarding_emails").select("status, attempts").eq("user_id", userId).eq("kind", kind).maybeSingle();
    if (!row || row.status === "sent" || row.status === "suppressed" || row.attempts >= MAX_ATTEMPTS) return;
    attempts = row.attempts;
  }
  try {
    const r = await sendTemplateEmail("provider-profile-reminder", email, {
      templateData: { name, variant: kind === "welcome" ? "welcome" : "reminder", siteUrl: SITE_URL },
      idempotencyKey: `provider-${kind}-${userId}`,
    });
    await db.from("provider_onboarding_emails")
      .update({ status: r.sent ? "sent" : "suppressed", attempts: attempts + 1, last_error: null, sent_at: new Date().toISOString() })
      .eq("user_id", userId).eq("kind", kind);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    console.error(`[provider-onboarding] ${kind} send failed:`, msg);
    await db.from("provider_onboarding_emails")
      .update({ status: "failed", attempts: attempts + 1, last_error: msg }).eq("user_id", userId).eq("kind", kind);
  }
}

/** Sends the welcome email if this verified provider's profile is still incomplete. */
export async function ensureProviderWelcome(db: Admin, userId: string) {
  try {
    const s = await loadState(db, userId);
    if (!s || !s.eligible || s.complete) return;
    await sendOnce(db, userId, "welcome", s.email, s.firstName);
  } catch (err) {
    console.error("[provider-onboarding] welcome:", err instanceof Error ? err.message : err);
  }
}

/** Hourly: welcome backfill, 24h/48h reminders (incomplete profiles only), retries. */
export async function processProviderOnboarding(db: Admin) {
  let checked = 0;
  const { data: rows } = await db
    .from("profiles").select("id")
    .or("is_provider.eq.true,role.eq.provider")
    .gte("created_at", new Date(ONBOARDING_CUTOFF).toISOString())
    .limit(500);
  for (const r of rows ?? []) {
    try {
      const s = await loadState(db, r.id);
      if (!s || !s.eligible || s.complete || !s.confirmedAt) continue;
      checked++;
      await sendOnce(db, r.id, "welcome", s.email, s.firstName);
      // At most one reminder per run, so a late-detected account never gets both at once.
      const { data: sentRows } = await db.from("provider_onboarding_emails").select("kind").eq("user_id", r.id);
      const have = new Set((sentRows ?? []).map((x) => x.kind));
      const next = dueReminders(s.signupAt).find((k) => !have.has(k));
      if (next) await sendOnce(db, r.id, next, s.email, s.firstName);
    } catch (err) {
      console.error("[provider-onboarding] process:", err instanceof Error ? err.message : err);
    }
  }
  return { checked };
}

/** One owner alert when the required business-profile fields are first complete. */
export async function notifyProfileCompleted(
  userId: string,
  p: { business_name?: string | null; service_category?: string | null; service_zip?: string | null },
) {
  if (!isProfileComplete(p)) return;
  const { sendOwnerAlert } = await import("@/lib/owner-notify.server");
  await sendOwnerAlert(`internal-profile-complete-${userId}`, "profile_complete", {
    leadType: "profile_complete",
    businessName: p.business_name,
    service: p.service_category,
    zip: p.service_zip,
    adminUrl: `${SITE_URL}/admin/providers`,
    submittedAt: new Date().toISOString(),
  });
}
