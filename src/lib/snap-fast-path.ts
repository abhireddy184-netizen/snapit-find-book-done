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