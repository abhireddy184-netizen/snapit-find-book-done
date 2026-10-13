import { describe, expect, it } from "vitest";
import { allowRequest, matchFaq, FALLBACK_FAQ, SUPPORT_SYSTEM_PROMPT } from "../support-chat.server";

describe("support chat rules", () => {
  it("allows 12 messages per IP then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 12; i++) expect(allowRequest("t-ip", now)).toBe(true);
    expect(allowRequest("t-ip", now)).toBe(false);
    expect(allowRequest("t-ip", now + 11 * 60 * 1000)).toBe(true);
  });
  it("area answer uses the expansion wording, no launch date", () => {
    expect(FALLBACK_FAQ.area).toBe("We're expanding; sign up and we'll notify you when we're available in your area.");
    expect(matchFaq("Is it available in my area?")).toBe("area");
  });
  it("prompt forbids invented prices and card requests", () => {
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/Never invent prices/);
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/Never ask for or accept card numbers/);
  });
});
