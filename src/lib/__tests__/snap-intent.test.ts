import { describe, expect, it } from "vitest";
import { normalizeAnalysis } from "@/lib/snap-analyze.server";
import { detectServiceIntentInText } from "@/lib/search-intent";
import { createFastPathAnalysis } from "@/lib/snap-fast-path";

/** The model's raw JSON for a wall-mounted TV photo: it guesses mounting. */
const mountingGuess = JSON.stringify({
  responseKind: "needs-info",
  categorySlug: "mounting-installation",
  category: "Mounting & Installation",
  headline: "Is this about mounting the TV?",
  problem: "TV appears wall mounted.",
  confidence: 0.4,
  hasPriceEstimate: false,
  estimatedCostLow: 0,
  estimatedCostHigh: 0,
  clarifyingQuestions: ["Do you want the TV mounted?", "What is wrong with the TV?"],
});

describe("free-text service intent", () => {
  it("detects repair intent inside a sentence", () => {
    const hit = detectServiceIntentInText("actually it's a TV repair, the screen is black");
    expect(hit?.service.slug).toBe("tv-repair");
  });

  it("keeps mounting distinct from repair", () => {
    expect(detectServiceIntentInText("can someone mount my tv")?.service.slug).toBe("tv-mounting");
  });

  it("resolves a broken sink locally to plumbing without clarification", () => {
    const hit = detectServiceIntentInText("my sink is broken, fix it");
    expect(hit?.category.slug).toBe("plumbing");
    expect(hit?.service.slug).toBe("drain-clearing");
    if (!hit) throw new Error("Expected a deterministic sink service match");
    const result = createFastPathAnalysis("my sink is broken, fix it", hit);
    expect(result.responseKind).toBe("diagnosis");
    expect(result.clarifyingQuestions).toHaveLength(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe("normalizeAnalysis progression", () => {
  it("lets the latest customer message override the photo guess", () => {
    const a = normalizeAnalysis(mountingGuess, true, true, "TV repair", {
      latestMessage: "TV repair",
      turnCount: 1,
      askedQuestions: ["Do you want the TV mounted?"],
    });
    expect(a.categorySlug).toBe("appliances");
    expect(a.serviceSlug).toBe("tv-repair");
    expect(a.responseKind).toBe("diagnosis");
    expect(a.clarifyingQuestions).toHaveLength(0);
  });

  it("never repeats a question that was already asked", () => {
    const a = normalizeAnalysis(mountingGuess, true, true, "not sure yet", {
      latestMessage: "not sure yet",
      turnCount: 1,
      askedQuestions: ["Do you want the TV mounted?", "What is wrong with the TV?"],
    });
    expect(a.clarifyingQuestions).toHaveLength(0);
  });

  it("resolves instead of asking when the customer asks to find a professional", () => {
    const a = normalizeAnalysis(mountingGuess, true, true, "tv is not working", {
      latestMessage: "find me a professional",
      forceResolve: true,
      turnCount: 1,
    });
    expect(a.responseKind).toBe("diagnosis");
    expect(a.categorySlug).toBeTruthy();
    expect(a.clarifyingQuestions).toHaveLength(0);
  });

  it("stops clarifying after the question budget is spent", () => {
    const a = normalizeAnalysis(mountingGuess, true, true, "the picture flickers", {
      latestMessage: "the picture flickers",
      turnCount: 2,
    });
    expect(a.responseKind).toBe("diagnosis");
    expect(a.clarifyingQuestions).toHaveLength(0);
  });
});
