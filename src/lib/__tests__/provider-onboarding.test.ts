import { describe, expect, it } from "vitest";
import { isOnboardingEligible, isProfileComplete, isReminderDue } from "../provider-onboarding-rules";

describe("provider onboarding rules", () => {
  it("profile is complete only with business name, category and 5-digit ZIP", () => {
    expect(isProfileComplete({ business_name: "Acme", service_category: "Plumbing", service_zip: "75034" })).toBe(true);
    expect(isProfileComplete({ business_name: "Acme", service_category: "Plumbing", service_zip: null })).toBe(false);
    expect(isProfileComplete({ business_name: " ", service_category: "Plumbing", service_zip: "75034" })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });
  it("unverified, deleted, or pre-cutoff accounts get no onboarding emails", () => {
    const ok = { created_at: "2026-10-12T00:00:00Z", email_confirmed_at: "2026-10-12T00:05:00Z" };
    expect(isOnboardingEligible(ok)).toBe(true);
    expect(isOnboardingEligible({ ...ok, email_confirmed_at: null })).toBe(false);
    expect(isOnboardingEligible({ ...ok, deleted: true })).toBe(false);
    expect(isOnboardingEligible({ ...ok, created_at: "2026-10-01T00:00:00Z" })).toBe(false);
  });
  it("reminder is due 48 hours after verification, not before", () => {
    const t = Date.parse("2026-10-12T00:00:00Z");
    expect(isReminderDue("2026-10-12T00:00:00Z", t + 47 * 3600e3)).toBe(false);
    expect(isReminderDue("2026-10-12T00:00:00Z", t + 48 * 3600e3)).toBe(true);
  });
});
