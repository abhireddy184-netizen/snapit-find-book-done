import { describe, expect, it } from "vitest";
import { isOnboardingEligible, isProfileComplete, dueReminders, shouldSendSubmittedConfirmation, shouldSendApprovedEmail } from "../provider-onboarding-rules";

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
  it("reminders are due at 24h and 48h after signup", () => {
    const t = Date.parse("2026-10-12T00:00:00Z");
    expect(dueReminders("2026-10-12T00:00:00Z", t + 23 * 3600e3)).toEqual([]);
    expect(dueReminders("2026-10-12T00:00:00Z", t + 24 * 3600e3)).toEqual(["reminder_24h"]);
    expect(dueReminders("2026-10-12T00:00:00Z", t + 48 * 3600e3)).toEqual(["reminder_24h", "reminder_48h"]);
  });
  it("profile-submitted email to live providers is off unless the flag is exactly 'true'", () => {
    const full = { business_name: "KYNGSTON SERVICES", service_category: "Handyman", service_zip: "75034" };
    expect(shouldSendSubmittedConfirmation(undefined, full)).toBe(false);
    expect(shouldSendSubmittedConfirmation("1", full)).toBe(false);
    expect(shouldSendSubmittedConfirmation("true", full)).toBe(true);
    expect(shouldSendSubmittedConfirmation("true", { ...full, service_zip: null })).toBe(false);
  });
  it("approval email only on a real change to verified, and only when switched on", () => {
    expect(shouldSendApprovedEmail(undefined, "pending", "verified")).toBe(false);
    expect(shouldSendApprovedEmail("true", "pending", "verified")).toBe(true);
    expect(shouldSendApprovedEmail("true", "unverified", "verified")).toBe(true);
    expect(shouldSendApprovedEmail("true", "verified", "verified")).toBe(false);
    expect(shouldSendApprovedEmail("true", "unverified", "pending")).toBe(false);
    expect(shouldSendApprovedEmail("true", "verified", "unverified")).toBe(false);
  });
});
