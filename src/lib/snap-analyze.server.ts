import { catalog } from "./catalog";
import { matchServiceIntent, rankServices } from "./search-intent";


export type IssueSource = "detected" | "possible" | "customer-described" | "insufficient";
export type ResponseKind = "diagnosis" | "options" | "needs-info" | "no-issue" | "safety-redirect";

export type ServiceOption = {
  categorySlug: string;
  serviceSlug?: string;
  label: string;
  reason?: string;
};

export type SnapAnalysis = {
  responseKind: ResponseKind;
  issueSource: IssueSource;
  headline: string;
  visualSubject?: string;
  category: string;
  categorySlug: string;
  confidence: number;
  problem: string;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  estimatedDurationMinutes: number;
  hasPriceEstimate: boolean;
  urgency: "low" | "medium" | "high" | "emergency";
  urgencyReason: string;
  recommendedActions: string[];
  possibleCauses?: string[];
  nextSteps?: string[];
  clarifyingQuestions?: string[];
  serviceOptions?: ServiceOption[];
  safetyNote?: string;
};

function catalogSummary() {
  return catalog
    .map((c) => `${c.slug}: ${c.services.map((s) => s.slug).join(", ")}`)
    .join("\n");
}

export const SYSTEM_PROMPT = `You are GPB (GetPerfectBoy.com), an AI service-discovery assistant for a USA-first home, outdoor, auto and at-home beauty services marketplace. GPB is NOT a dating service; it connects people with local service professionals.

The customer may send a photo, one or more frames from a short video, a text description, or both. Your job is to work out WHICH SERVICE they need — not to invent faults.

STEP 1 — DETERMINE THE INTENDED VISUAL SUBJECT (before looking for any issue).
If there is a text description, the subject is whatever the customer's words are about — always. Otherwise infer the subject from visual salience: the thing that is centered, prominent, closest to camera, in strongest focus, deliberately framed, held, or clearly placed as the subject of the shot. Everything else — the table it rests on, the floor, the wall behind it, incidental clutter — is CONTEXT ONLY.
- Never diagnose or route based on an incidental background/table/floor/wall scratch, stain or wear when a clearly more salient foreground object is the subject. A wallet on a scratched tabletop means the subject is the WALLET; say nothing about the tabletop unless the customer says the tabletop is the issue.
- A visible problem on a secondary/background object does NOT override a normal-looking main subject.
- Do NOT globally ignore surfaces: if the wall, floor, countertop, tile, lawn, bathroom, roof etc. is itself the dominant deliberately framed subject, it IS the intended subject and should route to the relevant service options.
- If two or more subjects are equally plausible and there is no description, do NOT guess: respond with "needs-info" (or "options") and ask a short question such as "What should GPB focus on in this photo?".
Set "visualSubject" to a short plain noun phrase for what you focused on (e.g. "Watch", "Wallet", "Kitchen wall", "Bathroom sink"). Use an empty string when there is no image.

If the subject shows no service need, use responseKind "no-issue" with a friendly headline naming it, e.g. "Your watch looks normal from this photo. What would you like help with?", then ask what they'd like done. Only mention services that exist in the catalog below; never invent product-specific services GPB does not support.

PRIORITY ORDER when deciding the issue:
1. The customer's own words (highest priority). If they describe a symptom, that IS the problem, even if the photo shows something else more visually obvious.
2. Visible condition in the image that plainly supports or extends their description.
3. Object class in the image (lowest priority — an object alone is NOT a fault).

HARD RULES
- NEVER fabricate a fault, a price, or urgency. If the image shows a normal-looking object with no visible problem and there is no description, respond with responseKind "no-issue", hasPriceEstimate false, costs 0, urgency "low", and a friendly headline like "Nothing obvious looks wrong from this photo."
- If several services plausibly fit (e.g. a whole room, a bathroom, a blank wall), respond with responseKind "options" and list 3-6 serviceOptions. Do not pretend certainty.
- If confidence is below ~0.6, respond with responseKind "needs-info" and ask 1-2 short clarifying questions BEFORE giving pricing. Set hasPriceEstimate false and costs 0.
- If the image looks like a medical concern (injury, rash, infection, burn, swelling, insect bite reaction, eye/wound issues), respond with responseKind "safety-redirect", do NOT treat it as beauty or repair, give no price, and set safetyNote advising a licensed medical professional. Emergencies: advise local emergency services.
- Cosmetic/grooming intent on hair, nails, skin, beard etc. routes to the beauty-at-home category.
- issueSource must be: "detected" (clearly visible), "possible" (likely but unconfirmed), "customer-described" (based on their words), or "insufficient".

CATEGORY + SERVICE SLUGS (categorySlug must be one of the category slugs; serviceSlug when used must belong to that category):
${catalogSummary()}

Return ONLY valid minified JSON, no markdown, matching:
{"responseKind":"diagnosis"|"options"|"needs-info"|"no-issue"|"safety-redirect","issueSource":"detected"|"possible"|"customer-described"|"insufficient","headline":string,"visualSubject":string,"category":string,"categorySlug":string,"confidence":number,"problem":string,"estimatedCostLow":number,"estimatedCostHigh":number,"estimatedDurationMinutes":number,"hasPriceEstimate":boolean,"urgency":"low"|"medium"|"high"|"emergency","urgencyReason":string,"recommendedActions":string[],"possibleCauses":string[],"nextSteps":string[],"clarifyingQuestions":string[],"serviceOptions":[{"categorySlug":string,"serviceSlug":string,"label":string,"reason":string}],"safetyNote":string}

Keep every string short and plain-language. Prices are USD typical ranges.`;

export function buildUserPrompt(note: string | undefined, hasMedia: boolean, frameCount = 1) {
  const described = note?.trim();
  if (!hasMedia) {
    return `The customer sent NO photo — only this description: "${described}". Work out the service from their words alone. Respond with JSON only.`;
  }
  const multi = frameCount > 1
    ? ` The ${frameCount} images are frames sampled across one short video of the same scene — read them together, not as separate problems.`
    : "";
  return described
    ? `Customer description (HIGHEST PRIORITY — treat this as the real problem even if the image shows something else): "${described}". Their words define the subject. Use the image only as supporting context.${multi} Respond with JSON only.`
    : `The customer sent ${frameCount > 1 ? `${frameCount} frames from one short video` : "an image"} with no description. First decide the intended visual subject from salience, then only report a problem if one is genuinely visible on THAT subject. Ignore incidental marks on surrounding surfaces.${multi} Respond with JSON only.`;
}

const CATEGORY_SLUGS = new Set(catalog.map((c) => c.slug));

/** Words that genuinely signal general handyman / odd-jobs intent. */
const HANDYMAN_INTENT =
  /\b(handy\s?man|handywoman|handyperson|odd jobs?|punch list|general repairs?|small repairs?|misc(ellaneous)? repairs?|fix ?it|to-?do list)\b/i;

export function normalizeAnalysis(
  raw: string,
  hadNote: boolean,
  hasMedia = false,
  note?: string,
): SnapAnalysis {
  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: Partial<SnapAnalysis> = {};
  try {
    parsed = JSON.parse(match ? match[0] : raw) as Partial<SnapAnalysis>;
  } catch {
    parsed = {};
  }

  const noteText = note?.trim() ?? "";
  const aiCategory =
    parsed.categorySlug && CATEGORY_SLUGS.has(parsed.categorySlug) ? parsed.categorySlug : null;

  // Never silently label an unclassified request "Handyman". When the AI gave
  // no valid category, try the customer's own words against the catalog first.
  let inferredService: { categorySlug: string; serviceSlug: string; label: string } | null = null;
  let inferredOptions: ServiceOption[] = [];
  if (!aiCategory && noteText) {
    const hit = matchServiceIntent(noteText);
    if (hit) {
      inferredService = {
        categorySlug: hit.category.slug,
        serviceSlug: hit.service.slug,
        label: hit.service.name,
      };
    } else if (HANDYMAN_INTENT.test(noteText)) {
      inferredService = { categorySlug: "handyman", serviceSlug: "handyman-hour", label: "General Handyman" };
    } else {
      inferredOptions = rankServices(noteText, 4).map((h) => ({
        categorySlug: h.category.slug,
        serviceSlug: h.service.slug,
        label: h.service.name,
        reason: h.category.name,
      }));
    }
  }

  // Empty slug = deliberately unclassified; the UI hides category chips, pricing
  // and pro matches for discovery states.
  const categorySlug = aiCategory ?? inferredService?.categorySlug ?? "";
  const cat = catalog.find((c) => c.slug === categorySlug);
  const unclassified = !categorySlug;
  const parsedKind: ResponseKind | undefined = parsed.responseKind;
  const responseKind: ResponseKind = unclassified
    ? parsedKind === "no-issue" || parsedKind === "safety-redirect"
      ? parsedKind
      : inferredOptions.length > 1
        ? "options"
        : "needs-info"
    : (parsedKind ?? (Object.keys(parsed).length ? "diagnosis" : "needs-info"));
  // Only a confident, single-service diagnosis may carry a price or pro match.
  // options / needs-info / no-issue / safety-redirect are discovery states.
  const hasPriceEstimate =
    responseKind === "diagnosis" &&
    Boolean(parsed.hasPriceEstimate ?? true) &&
    Number(parsed.estimatedCostLow ?? 0) > 0;

  return {
    responseKind,
    issueSource: parsed.issueSource ?? (hadNote ? "customer-described" : "possible"),
    visualSubject: hasMedia ? parsed.visualSubject?.trim() || undefined : undefined,
    headline: parsed.headline?.trim() ||
      (responseKind === "no-issue"
        ? "Nothing obvious looks wrong from this photo."
        : responseKind === "needs-info"
          ? "We need a little more detail."
          : responseKind === "options"
            ? "A few GPB services could fit — which one sounds right?"
            : cat?.name ?? "Let's narrow this down"),
    category: (aiCategory ? parsed.category?.trim() : inferredService?.label) || cat?.name || "",
    categorySlug,

    confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5))),
    problem: parsed.problem?.trim() ||
      "Tell us what you're noticing and we'll narrow it down to the right service.",
    estimatedCostLow: hasPriceEstimate ? Math.max(0, Math.round(Number(parsed.estimatedCostLow ?? 0))) : 0,
    estimatedCostHigh: hasPriceEstimate ? Math.max(0, Math.round(Number(parsed.estimatedCostHigh ?? 0))) : 0,
    estimatedDurationMinutes: Math.max(15, Math.round(Number(parsed.estimatedDurationMinutes ?? 60))),
    hasPriceEstimate,
    urgency: parsed.urgency ?? "low",
    urgencyReason: parsed.urgencyReason?.trim() || (hasPriceEstimate ? "Based on what we can see." : "Not enough information to judge urgency yet."),
    recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.filter(Boolean).slice(0, 5) : [],
    possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses.filter(Boolean).slice(0, 4) : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter(Boolean).slice(0, 4) : [],
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions.filter(Boolean).slice(0, 3) : [],
    serviceOptions: Array.isArray(parsed.serviceOptions)
      ? parsed.serviceOptions
          .filter((o) => o && CATEGORY_SLUGS.has(o.categorySlug))
          .slice(0, 6)
          .map((o) => ({
            categorySlug: o.categorySlug,
            serviceSlug: catalog.find((c) => c.slug === o.categorySlug)?.services.some((sv) => sv.slug === o.serviceSlug)
              ? o.serviceSlug
              : undefined,
            label: o.label,
            reason: o.reason,
          }))
      : [],
    safetyNote: parsed.safetyNote?.trim() || undefined,
  };
}
