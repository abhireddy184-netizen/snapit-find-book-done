// Pure rules for provider onboarding emails (shared by server code and tests).

/** Only accounts created after onboarding automation went live — never retroactive. */
export const ONBOARDING_CUTOFF = Date.parse("2026-10-11T02:00:00Z");
export const REMINDER_DELAY_MS = 48 * 3600 * 1000;

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

/** 48-hour reminder is due once 48h passed since email verification. */
export function isReminderDue(emailConfirmedAt: string, now = Date.now()): boolean {
  return now - Date.parse(emailConfirmedAt) >= REMINDER_DELAY_MS;
}
