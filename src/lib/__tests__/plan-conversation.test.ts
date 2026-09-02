import { describe, expect, it } from "vitest";
import {
  UNDERSTAND_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  normalizeUnderstanding,
} from "../plan.server";

/**
 * Casual banter must stay banter: GPB answers playfully and does NOT invent a
 * task. The classic case is a Telugu "ఏం కావాలి రా?" ("what do you want?"),
 * where GPB jokes about two kilos of potatoes — that joke is GPB's own words
 * and must never be turned into a grocery request.
 */
describe("conversational vs actionable", () => {
  it("keeps a casual Telugu question conversational, with GPB's joke as the reply only", () => {
    const raw = JSON.stringify({
      languageCode: "te",
      languageName: "తెలుగు",
      script: "native",
      codeSwitched: false,
      actionability: "conversational",
      normalizedRequest: "",
      confidence: 0.9,
      criticalAmbiguity: "",
      clarificationQuestion: "",
      conversationalReply: "రెండు కిలోల బంగాళాదుంపలు కావాలి 😄",
      invitation: "నీకు ఏం పని చేయాలో చెప్పు!",
    });
    const u = normalizeUnderstanding(raw, "ఏం కావాలి రా?");
    expect(u.actionability).toBe("conversational");
    expect(u.conversationalReply).toContain("బంగాళాదుంపలు");
    // The user's own words stay the canonical request — never GPB's joke.
    expect(u.normalizedRequest).toBe("ఏం కావాలి రా?");
    expect(u.clarificationQuestion).toBeUndefined();
  });

  it("treats a genuine potato request as actionable", () => {
    const raw = JSON.stringify({
      languageCode: "te",
      languageName: "తెలుగు",
      script: "native",
      codeSwitched: false,
      actionability: "actionable",
      normalizedRequest: "Buy 2 kg potatoes",
      confidence: 0.95,
      criticalAmbiguity: "",
      clarificationQuestion: "",
      conversationalReply: "",
      invitation: "",
    });
    const u = normalizeUnderstanding(raw, "నాకు రెండు కిలోల బంగాళాదుంపలు కావాలి");
    expect(u.actionability).toBe("actionable");
    expect(u.conversationalReply).toBeUndefined();
    expect(u.normalizedRequest).toBe("Buy 2 kg potatoes");
  });

  it("never drops a real task just because the model forgot to write a reply", () => {
    const raw = JSON.stringify({
      actionability: "conversational",
      conversationalReply: "",
      normalizedRequest: "Ride to DFW by 6 PM",
      confidence: 0.9,
    });
    const u = normalizeUnderstanding(raw, "airport 6 pm");
    expect(u.actionability).toBe("actionable");
  });
});

describe("understanding prompt guardrails", () => {
  it("forbids treating GPB's own banter as the user's request", () => {
    expect(UNDERSTAND_SYSTEM_PROMPT).toMatch(/YOUR OWN WORDS ARE NEVER THE USER'S REQUEST/);
    expect(UNDERSTAND_SYSTEM_PROMPT).toMatch(/potatoes/i);
  });

  it("allows a light emoji in casual replies but not in serious contexts", () => {
    expect(UNDERSTAND_SYSTEM_PROMPT).toContain("😄");
    expect(UNDERSTAND_SYSTEM_PROMPT).toMatch(/NEVER in a serious, distressed, urgent/);
  });

  it("forbids a stock repeated joke", () => {
    expect(UNDERSTAND_SYSTEM_PROMPT).toMatch(/never reuse a stock joke/i);
  });

  it("treats everyday non-service outings as actionable", () => {
    expect(UNDERSTAND_SYSTEM_PROMPT).toMatch(/golf|sports outing/i);
  });
});

describe("planning prompt guardrails", () => {
  it("refuses to force non-service activities into the service taxonomy", () => {
    expect(PLAN_SYSTEM_PROMPT).toMatch(/NEVER force a non-service activity into a service category/);
    expect(PLAN_SYSTEM_PROMPT).toMatch(/errands|favour/i);
    expect(PLAN_SYSTEM_PROMPT).toMatch(/golf/i);
  });

  it("still refuses to claim bookings", () => {
    expect(PLAN_SYSTEM_PROMPT).toMatch(/Never promise anything is booked/);
  });
});
