import { describe, expect, it } from "vitest";
import { promoCountdown, promoLabel, promoVisible } from "../promo-banner";

describe("Founding Pros promo banner rules", () => {
  it("shows BLACK FRIDAY before Nov 28, 2026 (Chicago) and HOLIDAY OFFER from then on", () => {
    expect(promoLabel(Date.parse("2026-11-27T23:59:00-06:00"))).toBe("BLACK FRIDAY");
    expect(promoLabel(Date.parse("2026-11-28T00:00:00-06:00"))).toBe("HOLIDAY OFFER");
  });
  it("stops rendering after Dec 31, 2026 11:59 PM America/Chicago", () => {
    expect(promoVisible(Date.parse("2026-12-31T23:58:59-06:00"))).toBe(true);
    expect(promoVisible(Date.parse("2026-12-31T23:59:00-06:00"))).toBe(false);
    expect(promoVisible(Date.parse("2027-01-02T12:00:00-06:00"))).toBe(false);
  });
  it("counts down to Dec 31, 2026 11:59 PM Chicago", () => {
    expect(promoCountdown(Date.parse("2026-12-30T23:58:00-06:00"))).toEqual({ days: 1, hours: 0, minutes: 1, seconds: 0 });
    expect(promoCountdown(Date.parse("2027-01-05T00:00:00Z"))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
