import { describe, it, expect } from "vitest";
import { activationReadiness, computeMetrics, simulationBlockReason, buildScript, TELEPHONY_CONNECTED, COMPLIANCE_ITEMS } from "../proconnect";

const lead = (o: Partial<Parameters<typeof simulationBlockReason>[0]> = {}) => ({
  status: "new", consent_status: "unknown", do_not_call: false, is_demo: false, next_follow_up_at: null, signed_up_user_id: null, ...o,
});
const allChecked = Object.fromEntries(COMPLIANCE_ITEMS.map((i) => [i.key, true]));

describe("ProConnect rules", () => {
  it("no telephony provider is connected", () => {
    expect(TELEPHONY_CONNECTED).toBe(false);
  });
  it("activation stays blocked while telephony is not connected, even with every compliance item checked", () => {
    const r = activationReadiness(allChecked);
    expect(r.ready).toBe(false);
    expect(r.missing).toEqual(["Phone/voice provider is not connected"]);
  });
  it("activation is blocked when any compliance item is missing", () => {
    expect(activationReadiness({ ...allChecked, dnc_registry_scrub: false }, true).ready).toBe(false);
    expect(activationReadiness(allChecked, true).ready).toBe(true);
  });
  it("do-not-call leads can never be simulated, even demo ones", () => {
    expect(simulationBlockReason(lead({ do_not_call: true, is_demo: true, consent_status: "granted" }))).not.toBeNull();
    expect(simulationBlockReason(lead({ consent_status: "revoked", is_demo: true }))).not.toBeNull();
  });
  it("real leads need recorded consent before simulation", () => {
    expect(simulationBlockReason(lead())).toBe("Record call consent first.");
    expect(simulationBlockReason(lead({ consent_status: "granted" }))).toBeNull();
    expect(simulationBlockReason(lead({ is_demo: true }))).toBeNull();
  });
  it("conversion counts only real leads that signed up", () => {
    const m = computeMetrics([
      lead({ status: "signed_up" }), lead({ status: "interested" }), lead({ status: "new" }), lead({ status: "new" }),
      lead({ status: "signed_up", is_demo: true }),
    ]);
    expect(m.real).toBe(4);
    expect(m.signedUp).toBe(1);
    expect(m.conversionRate).toBe(25);
  });
  it("scripts disclose AI and offer opt-out in English and Spanish", () => {
    const v = { businessName: "X", category: "Plumbing", city: "Dallas" };
    expect(buildScript("en", v).join(" ")).toMatch(/AI assistant.*not a live person/);
    expect(buildScript("en", v).join(" ")).toMatch(/remove you/);
    expect(buildScript("es", v).join(" ")).toMatch(/asistente de IA/);
    expect(buildScript("es", v).join(" ")).toMatch(/quitamos de nuestra lista/);
  });
});
