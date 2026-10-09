import { describe, expect, it } from "vitest";
import { matchTradeWord, tradeHeadline, topServicesForTrade } from "@/lib/trade-mapping";

describe("trade word mapping", () => {
  it("maps plumber/plumbing to Plumbing", () => {
    expect(matchTradeWord("plumber")?.categorySlug).toBe("plumbing");
    expect(matchTradeWord("plumbing")?.categorySlug).toBe("plumbing");
  });

  it("maps electrician to Electrical", () => {
    expect(matchTradeWord("electrician")?.categorySlug).toBe("electrical");
  });

  it("maps hvac to Heating & Cooling", () => {
    expect(matchTradeWord("hvac")?.categorySlug).toBe("hvac");
  });

  it("maps cleaner/house cleaning to Home Cleaning", () => {
    expect(matchTradeWord("cleaner")?.categorySlug).toBe("cleaning");
    expect(matchTradeWord("house cleaning")?.categorySlug).toBe("cleaning");
  });

  it("maps handyman to Handyman", () => {
    expect(matchTradeWord("handyman")?.categorySlug).toBe("handyman");
  });

  it("maps roofer to Roofing", () => {
    expect(matchTradeWord("roofer")?.categorySlug).toBe("roofing-exterior");
  });

  it("builds a trade headline, never a single narrow sub-service name", () => {
    const headline = tradeHeadline("plumber", "Frisco, TX");
    expect(headline).toBe("Plumbers near Frisco, TX");
    expect(headline).not.toMatch(/Drain Clearing/i);
  });

  it("returns null for words that aren't a known trade", () => {
    expect(matchTradeWord("banana")).toBeNull();
  });

  it("lists top services for a trade category", () => {
    const top = topServicesForTrade("plumbing", 3);
    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(3);
  });
});
