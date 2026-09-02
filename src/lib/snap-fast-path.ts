import type { ServiceHit } from "@/lib/catalog";
import type { SnapAnalysis } from "@/lib/snap-analyze.functions";

/** Build a complete diagnosis without an AI/network round trip for a clear catalog match. */
export function createFastPathAnalysis(request: string, hit: ServiceHit): SnapAnalysis {
  return {
    responseKind: "diagnosis",
    issueSource: "customer-described",
    headline: `${hit.service.name} — that's what this sounds like.`,
    category: hit.service.name,
    categorySlug: hit.category.slug,
    serviceSlug: hit.service.slug,
    confidence: 0.9,
    problem: request.trim(),
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    estimatedDurationMinutes: 60,
    hasPriceEstimate: false,
    urgency: "medium",
    urgencyReason: "Based on what you described.",
    recommendedActions: [],
    possibleCauses: [],
    nextSteps: [],
    clarifyingQuestions: [],
    serviceOptions: [],
  };
}
/** Local recovery when the AI is slow/unavailable for a text request: offer the best catalog matches. */
export function createLocalOptionsAnalysis(request: string, hits: ServiceHit[]): SnapAnalysis | null {
  if (!hits.length) return null;
  const [best, ...rest] = hits;
  return {
    responseKind: rest.length ? "options" : "diagnosis",
    issueSource: "customer-described",
    headline: rest.length
      ? "Here's what fits best — pick the closest one."
      : `${best.service.name} — that's what this sounds like.`,
    category: best.service.name,
    categorySlug: best.category.slug,
    serviceSlug: best.service.slug,
    confidence: rest.length ? 0.55 : 0.8,
    problem: request.trim(),
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    estimatedDurationMinutes: 60,
    hasPriceEstimate: false,
    urgency: "medium",
    urgencyReason: "Based on what you described.",
    recommendedActions: [],
    possibleCauses: [],
    nextSteps: [],
    clarifyingQuestions: [],
    serviceOptions: hits.map((h) => ({
      categorySlug: h.category.slug,
      serviceSlug: h.service.slug,
      label: h.service.name,
      reason: h.category.name,
    })),
  };
}
