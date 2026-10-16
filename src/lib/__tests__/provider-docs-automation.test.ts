import { describe, expect, it } from "vitest";
import { hasRequiredDocs, shouldQueueDocumentsRequest, dueDocReminders, isDocsEmailEnabled, isDocsAutomationEligible } from "../provider-onboarding-rules";

describe("provider document email automation rules", () => {
  it("existing pros (signed up before 2026-10-16 17:00 UTC, e.g. KYNGSTON) are never queued", () => {
    expect(isDocsAutomationEligible("2026-10-10T12:00:00Z")).toBe(false);
    expect(shouldQueueDocumentsRequest({ signupAt: "2026-10-10T12:00:00Z", complete: true, priorManualRequests: 0 })).toBe(false);
  });
  it("new pro with a complete profile and no earlier request is queued", () => {
    expect(shouldQueueDocumentsRequest({ signupAt: "2026-10-17T00:00:00Z", complete: true, priorManualRequests: 0 })).toBe(true);
  });
  it("incomplete profile or an earlier manual admin request blocks the automatic checklist", () => {
    expect(shouldQueueDocumentsRequest({ signupAt: "2026-10-17T00:00:00Z", complete: false, priorManualRequests: 0 })).toBe(false);
    expect(shouldQueueDocumentsRequest({ signupAt: "2026-10-17T00:00:00Z", complete: true, priorManualRequests: 1 })).toBe(false);
  });
  it("receipt needs business registration AND insurance; trade license optional; rejected files don't count", () => {
    expect(hasRequiredDocs([{ doc_type: "business_registration", status: "pending" }])).toBe(false);
    expect(hasRequiredDocs([{ doc_type: "business_registration", status: "pending" }, { doc_type: "liability_insurance", status: "pending" }])).toBe(true);
    expect(hasRequiredDocs([{ doc_type: "business_registration", status: "accepted" }, { doc_type: "liability_insurance", status: "rejected" }])).toBe(false);
  });
  it("document reminders are due 24h and 48h after the checklist was sent", () => {
    const t = Date.parse("2026-10-17T00:00:00Z");
    expect(dueDocReminders("2026-10-17T00:00:00Z", t + 23 * 3600e3)).toEqual([]);
    expect(dueDocReminders("2026-10-17T00:00:00Z", t + 24 * 3600e3)).toEqual(["documents_reminder_24h"]);
    expect(dueDocReminders("2026-10-17T00:00:00Z", t + 48 * 3600e3)).toEqual(["documents_reminder_24h", "documents_reminder_48h"]);
  });
  it("document emails are off unless the switch is exactly 'true'", () => {
    expect(isDocsEmailEnabled(undefined)).toBe(false);
    expect(isDocsEmailEnabled("1")).toBe(false);
    expect(isDocsEmailEnabled("true")).toBe(true);
  });
});
