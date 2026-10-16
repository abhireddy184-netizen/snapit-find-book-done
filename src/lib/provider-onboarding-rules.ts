// Pure rules for provider onboarding emails (shared by server code and tests).

/** Only accounts created after onboarding automation went live — never retroactive. */
export const ONBOARDING_CUTOFF = Date.parse("2026-10-11T02:00:00Z");
export const REMINDER_24H_MS = 24 * 3600 * 1000;
export const REMINDER_48H_MS = 48 * 3600 * 1000;

export type ProfileFields = {
  business_name?: string | null;
  service_category?: string | null;
  service_zip?: string | null;
} | null | undefined;

/** Required business-profile fields: business name, service category, service ZIP. */
export function isProfileComplete(p: ProfileFields): boolean {
  return Boolean(p?.business_name?.trim() && p?.service_category?.trim() && /^\d{5}$/.test(p?.service_zip?.trim() ?? ""));
}

/** Account is eligible for onboarding emails: verified, created after cutoff, not deleted. */
export function isOnboardingEligible(u: { created_at?: string | null; email_confirmed_at?: string | null; deleted?: boolean }): boolean {
  if (u.deleted || !u.email_confirmed_at || !u.created_at) return false;
  return Date.parse(u.created_at) >= ONBOARDING_CUTOFF;
}

/** Reminders due for an incomplete profile, measured from signup (account creation). */
export function dueReminders(signupAt: string, now = Date.now()): Array<"reminder_24h" | "reminder_48h"> {
  const age = now - Date.parse(signupAt);
  const out: Array<"reminder_24h" | "reminder_48h"> = [];
  if (age >= REMINDER_24H_MS) out.push("reminder_24h");
  if (age >= REMINDER_48H_MS) out.push("reminder_48h");
  return out;
}

/**
 * Live provider "profile submitted" confirmation is OFF unless the server flag is exactly "true".
 * Kept off until the owner approves the sample email.
 */
export function isSubmittedEmailEnabled(flag: string | undefined | null): boolean {
  return flag === "true";
}

/** Send the submitted confirmation only when the switch is on and the required fields are complete. */
export function shouldSendSubmittedConfirmation(flag: string | undefined | null, p: ProfileFields): boolean {
  return isSubmittedEmailEnabled(flag) && isProfileComplete(p);
}

/** Approval email only on a genuine change to 'verified' while the live switch is exactly "true". */
export function shouldSendApprovedEmail(flag: string | undefined | null, previous: string | null | undefined, next: string): boolean {
  return flag === "true" && next === "verified" && previous !== "verified";
}

// ---- Document checklist automation (added 2026-10-16) ----

/** Only pros who sign up after document automation went live; existing pros are never emailed by it. */
export const DOCS_AUTOMATION_CUTOFF = Date.parse("2026-10-16T17:00:00Z");
/** Delay between the "profile received" email and the document checklist, so they don't land at once. */
export const DOCS_REQUEST_DELAY_MS = 15 * 60 * 1000;
/** Always requested. Trade licenses depend on the services offered, so they are asked for but not required. */
export const REQUIRED_DOC_TYPES = ["business_registration", "liability_insurance"] as const;

export function isDocsEmailEnabled(flag: string | undefined | null): boolean {
  return flag === "true";
}

export function isDocsAutomationEligible(signupAt: string | null | undefined): boolean {
  return Boolean(signupAt) && Date.parse(signupAt as string) >= DOCS_AUTOMATION_CUTOFF;
}

/** The meaningful set: every required type has at least one file that wasn't rejected. */
export function hasRequiredDocs(docs: Array<{ doc_type: string; status: string }>): boolean {
  return REQUIRED_DOC_TYPES.every((t) => docs.some((d) => d.doc_type === t && d.status !== "rejected"));
}

/** Queue the automatic checklist only for new pros with a complete profile and no earlier (manual) request. */
export function shouldQueueDocumentsRequest(o: { signupAt: string | null | undefined; complete: boolean; priorManualRequests: number }): boolean {
  return o.complete && o.priorManualRequests === 0 && isDocsAutomationEligible(o.signupAt);
}

/** Document reminders, measured from when the checklist email was sent. */
export function dueDocReminders(sentAt: string, now = Date.now()): Array<"documents_reminder_24h" | "documents_reminder_48h"> {
  const age = now - Date.parse(sentAt);
  const out: Array<"documents_reminder_24h" | "documents_reminder_48h"> = [];
  if (age >= REMINDER_24H_MS) out.push("documents_reminder_24h");
  if (age >= REMINDER_48H_MS) out.push("documents_reminder_48h");
  return out;
}
