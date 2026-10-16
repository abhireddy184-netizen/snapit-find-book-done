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

/**
 * Once-only "profile submitted / pending review" email to the provider.
 * Disabled unless server env PROVIDER_SUBMITTED_EMAIL_ENABLED === "true" (default off).
 * Recorded in provider_onboarding_emails (PK user_id+kind) before sending, so edits never resend.
 */
export async function sendProfileSubmittedConfirmation(
  db: Admin,
  userId: string,
  p: { business_name?: string | null; service_category?: string | null; service_zip?: string | null },
) {
  try {
    const { shouldSendSubmittedConfirmation } = await import("./provider-onboarding-rules");
    if (!shouldSendSubmittedConfirmation(process.env["PROVIDER_SUBMITTED_EMAIL_ENABLED"], p)) return;
    const { data: res } = await db.auth.admin.getUserById(userId);
    const email = res?.user?.email;
    if (!email || !res?.user?.email_confirmed_at) return;
    const kind = "profile_submitted";
    const { error } = await db.from("provider_onboarding_emails").insert({ user_id: userId, kind });
    let attempts = 0;
    if (error) {
      if ((error as { code?: string }).code !== "23505") return;
      const { data: row } = await db.from("provider_onboarding_emails")
        .select("status, attempts").eq("user_id", userId).eq("kind", kind).maybeSingle();
      if (!row || row.status === "sent" || row.status === "suppressed" || row.attempts >= MAX_ATTEMPTS) return;
      attempts = row.attempts;
    }
    try {
      const r = await sendTemplateEmail("provider-profile-submitted", email, {
        templateData: { businessName: p.business_name ?? undefined, siteUrl: SITE_URL },
        idempotencyKey: `provider-profile-submitted-${userId}`,
      });
      await db.from("provider_onboarding_emails")
        .update({ status: r.sent ? "sent" : "suppressed", attempts: attempts + 1, last_error: null, sent_at: new Date().toISOString() })
        .eq("user_id", userId).eq("kind", kind);
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      await db.from("provider_onboarding_emails")
        .update({ status: "failed", attempts: attempts + 1, last_error: msg }).eq("user_id", userId).eq("kind", kind);
    }
  } catch (err) {
    console.error("[provider-onboarding] submitted:", err instanceof Error ? err.message : err);
  }
}

/**
 * Approval emails are queued by the database (admin_set_provider_verification inserts a
 * kind "approved", status "pending" row in the same transaction as the change to verified).
 * This drains that outbox. While PROVIDER_APPROVED_EMAIL_ENABLED !== "true", queued jobs are
 * marked "skipped_disabled" and never sent later (no surprise backlog when switched on).
 * Re-checks the pro is still verified before sending; at most once per pro, ever.
 */
export async function processApprovedEmails(db: Admin, onlyUserId?: string) {
  let q = db.from("provider_onboarding_emails")
    .select("user_id, attempts").eq("kind", "approved").in("status", ["pending", "failed"]).lt("attempts", MAX_ATTEMPTS).limit(100);
  if (onlyUserId) q = q.eq("user_id", onlyUserId);
  const { data: jobs } = await q;
  const enabled = process.env["PROVIDER_APPROVED_EMAIL_ENABLED"] === "true";
  for (const job of jobs ?? []) {
    const done = (patch: { status: string; attempts?: number; last_error?: string | null; sent_at?: string }) =>
      db.from("provider_onboarding_emails").update(patch).eq("user_id", job.user_id).eq("kind", "approved");
    try {
      if (!enabled) { await done({ status: "skipped_disabled" }); continue; }
      const { data: pp } = await db.from("provider_profiles")
        .select("business_name, verification_status").eq("user_id", job.user_id).maybeSingle();
      if (!pp || pp.verification_status !== "verified") { await done({ status: "skipped_not_verified" }); continue; }
      const { data: res } = await db.auth.admin.getUserById(job.user_id);
      const email = res?.user?.email;
      if (!email || !res?.user?.email_confirmed_at) { await done({ status: "skipped_no_email" }); continue; }
      try {
        const r = await sendTemplateEmail("provider-profile-approved", email, {
          templateData: { businessName: pp.business_name ?? undefined, siteUrl: SITE_URL },
          idempotencyKey: `provider-profile-approved-${job.user_id}`,
        });
        await done({ status: r.sent ? "sent" : "suppressed", attempts: job.attempts + 1, last_error: null, sent_at: new Date().toISOString() });
      } catch (err) {
        await done({ status: "failed", attempts: job.attempts + 1, last_error: (err instanceof Error ? err.message : String(err)).slice(0, 300) });
      }
    } catch (err) {
      console.error("[provider-onboarding] approved:", err instanceof Error ? err.message : err);
    }
  }
}

/** Hourly: drain approval outbox and retry failed submitted confirmations (never backfills). */
export async function retryProviderConfirmations(db: Admin) {
  await processApprovedEmails(db);
  const { data: rows } = await db.from("provider_onboarding_emails")
    .select("user_id").eq("kind", "profile_submitted").eq("status", "failed").lt("attempts", MAX_ATTEMPTS).limit(100);
  for (const r of rows ?? []) {
    const { data: pp } = await db.from("provider_profiles")
      .select("business_name, service_category, service_zip").eq("user_id", r.user_id).maybeSingle();
    if (pp) await sendProfileSubmittedConfirmation(db, r.user_id, pp);
  }
}
