import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isProviderSetupIncomplete,
  missingSetupItems,
  requiredSetupDocuments,
  setupRemindersAllowed,
  type SetupDraft,
} from "../provider-setup-rules";
import { dueReminders } from "../provider-onboarding-rules";
import { processUnifiedSubmissionEmails } from "../provider-onboarding.server";

const send = vi.hoisted(() => vi.fn());
vi.mock("../email-templates/send-email", () => ({ sendTemplateEmail: send }));

const draft: SetupDraft = {
  full_name: "Test Pro",
  phone: "5551234567",
  business_name: "Test Work",
  business_type: "registered_business",
  category_slugs: ["cleaning"],
  service_slugs: ["standard-cleaning"],
  service_area: "Chicago",
  service_zip: "60601",
  service_radius_miles: 25,
  bio: "",
  trade_license_required: false,
};
const documents = [
  { doc_type: "business_registration", status: "pending" },
  { doc_type: "liability_insurance", status: "accepted" },
];

describe("unified provider setup requirements", () => {
  it("phone and name remain required even without documents", () => {
    expect(missingSetupItems({ ...draft, full_name: "", phone: "" }, [])).toEqual(
      ["Name", "Phone number"],
    );
  });
  it("registered businesses can submit a basic profile with no uploads", () => {
    expect(requiredSetupDocuments(draft)).toEqual([]);
    expect(missingSetupItems(draft, [])).toEqual([]);
  });
  it("existing drafts with applicable trade license selected can submit without that license or insurance", () => {
    expect(missingSetupItems({ ...draft, business_type: "individual", trade_license_required: true }, [])).toEqual([]);
  });
  it("optional pending, accepted or rejected uploads do not block review", () => {
    expect(missingSetupItems(draft, documents)).toEqual([]);
    expect(
      missingSetupItems(
        draft,
        documents.map((d) => ({ ...d, status: "rejected" })),
      ),
    ).toEqual([]);
  });
  it("unknown services cannot satisfy setup", () => {
    expect(missingSetupItems({ ...draft, service_slugs: ["not-a-service"] }, documents)).toContain(
      "Services",
    );
  });
  it("Other Services with a description satisfies Services without a listed service", () => {
    const otherOnly = { ...draft, category_slugs: [], service_slugs: [], other_service_description: "Home tutoring" };
    expect(missingSetupItems(otherOnly, documents, { otherSelected: true })).toEqual([]);
  });
  it("Other Services checked but left empty asks for a description", () => {
    expect(missingSetupItems({ ...draft, other_service_description: "  " }, documents, { otherSelected: true })).toContain(
      "Describe your service (Other services)",
    );
    expect(missingSetupItems({ ...draft, category_slugs: [], service_slugs: [] }, documents)).toContain("Services");
  });
  it("reminders stop for submitted, pending review or active profiles", () => {
    expect(setupRemindersAllowed("pending_setup", "unverified")).toBe(true);
    expect(setupRemindersAllowed("under_verification", "pending")).toBe(false);
    expect(setupRemindersAllowed("pending_setup", "pending")).toBe(false);
    expect(setupRemindersAllowed("pending_setup", "verified")).toBe(false);
  });
  it("setup reminders are staged at 24 and 48 hours after signup", () => {
    const signup = "2026-10-17T00:00:00Z";
    const t = Date.parse(signup);
    expect(dueReminders(signup, t + 23 * 3600000)).toEqual([]);
    expect(dueReminders(signup, t + 24 * 3600000)).toEqual(["reminder_24h"]);
    expect(dueReminders(signup, t + 48 * 3600000)).toEqual(["reminder_24h", "reminder_48h"]);
  });
});

function fixture(state = "under_verification") {
  const ledger = { user_id: "fixture-only", attempts: 0, status: "pending", claim_token: "" };
  const setup = {
    state,
    submitted_at: state === "under_verification" ? "2026-10-17T16:00:00Z" : null,
  };
  const db = {
    rpc: vi.fn(async () => {
      if (!["pending", "failed"].includes(ledger.status)) return { data: [] };
      ledger.status = "sending";
      ledger.attempts++;
      ledger.claim_token = `lease-${ledger.attempts}`;
      return { data: [{ token: ledger.claim_token, attempt: ledger.attempts }] };
    }),
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({
          data: { user: { email: "fixture@example.invalid", email_confirmed_at: "2026-10-17" } },
        })),
      },
    },
    from(table: string) {
      let patch: Record<string, unknown> | undefined;
      const q: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "lt", "limit"]) q[method] = () => q;
      q["update"] = (p: Record<string, unknown>) => {
        patch = p;
        return q;
      };
      q["maybeSingle"] = async () => ({
        data:
          table === "provider_setup"
            ? setup
            : { business_name: "Fixture", verification_status: "pending" },
      });
      q["then"] = (resolve: (value: unknown) => void) => {
        if (patch) Object.assign(ledger, patch);
        resolve({
          data:
            table === "provider_onboarding_emails" && ["pending", "failed"].includes(ledger.status)
              ? [{ ...ledger }]
              : [],
        });
      };
      return q;
    },
  };
  return { db, ledger, setup };
}

describe("submission outbox with mocked email service only", () => {
  beforeEach(() => {
    vi.stubEnv("PROVIDER_SUBMITTED_EMAIL_ENABLED", "true");
    send.mockReset();
    send.mockResolvedValue({ sent: true });
  });
  it("draft save or partial upload never sends a verification email", async () => {
    const f = fixture("pending_setup");
    await processUnifiedSubmissionEmails(f.db as never);
    expect(send).not.toHaveBeenCalled();
  });
  it("explicit completed submission sends once and repeated signup/processing cannot duplicate it", async () => {
    const f = fixture();
    await processUnifiedSubmissionEmails(f.db as never);
    await processUnifiedSubmissionEmails(f.db as never);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      "provider-setup-submitted",
      "fixture@example.invalid",
      expect.objectContaining({ idempotencyKey: "provider-profile-submitted-fixture-only" }),
    );
    expect(f.ledger.status).toBe("sent");
  });
  it("failure is durable and retry reuses the same email idempotency key", async () => {
    const f = fixture();
    send.mockRejectedValueOnce(new Error("temporary failure"));
    await processUnifiedSubmissionEmails(f.db as never);
    expect(f.ledger.status).toBe("failed");
    await processUnifiedSubmissionEmails(f.db as never);
    expect(f.ledger.status).toBe("sent");
    expect(send.mock.calls[0]?.[2].idempotencyKey).toBe(send.mock.calls[1]?.[2].idempotencyKey);
  });
  it("concurrent immediate and scheduled submission processing acquires only one lease", async () => {
    const f = fixture();
    await Promise.all([
      processUnifiedSubmissionEmails(f.db as never),
      processUnifiedSubmissionEmails(f.db as never),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(f.ledger.attempts).toBe(1);
  });
  it("disabled sending makes no outbound request and leaves the durable job pending", async () => {
    vi.stubEnv("PROVIDER_SUBMITTED_EMAIL_ENABLED", "false");
    const f = fixture();
    await processUnifiedSubmissionEmails(f.db as never);
    expect(send).not.toHaveBeenCalled();
    expect(f.ledger.status).toBe("pending");
  });
});

describe("setup schema Other Services", () => {
  it("accepts a custom service with no catalog services and rejects overly long text", async () => {
    const { providerSetupSchema } = await import("../provider-setup-schema");
    const base = { ...draft, category_slugs: [], service_slugs: [] };
    expect(providerSetupSchema.parse({ ...base, other_service_description: " Online classes " }).other_service_description).toBe("Online classes");
    expect(providerSetupSchema.parse(base).other_service_description).toBe("");
    expect(() => providerSetupSchema.parse({ ...base, other_service_description: "x".repeat(301) })).toThrow();
  });
});

describe('Resume & Complete Setup visibility', () => {
  it('shows for an unreviewed pro still in pending setup', () => expect(isProviderSetupIncomplete('pending_setup', 'unverified')).toBe(true));
  it('shows for an unreviewed pro with no setup row yet', () => expect(isProviderSetupIncomplete(null, null)).toBe(true));
  it('hides once setup is submitted for verification', () => expect(isProviderSetupIncomplete('under_verification', 'unverified')).toBe(false));
  it('hides while admin review is pending', () => expect(isProviderSetupIncomplete('pending_setup', 'pending')).toBe(false));
  it('hides for an approved pro', () => expect(isProviderSetupIncomplete(null, 'verified')).toBe(false));
});
