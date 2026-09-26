import { catalog } from "./catalog";
import { detectServiceIntentInText, matchServiceIntent, rankServices } from "./search-intent";


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
  serviceSlug?: string;
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
  /** True when no AI could read the photo; the result came from the customer's words / a recovery prompt. */
  visionUnavailable?: boolean;
};

/** Photo couldn't be analysed by any provider: ask for one short hint instead of a dead end. */
export function createPhotoRecoveryAnalysis(): SnapAnalysis {
  return {
    responseKind: "needs-info",
    issueSource: "insufficient",
    headline: "We couldn't read your photo just now. What needs fixing?",
    category: "",
    categorySlug: "",
    confidence: 0,
    problem: "Add a few words — for example \"leaking sink\" or \"TV won't turn on\" — and we'll find the right pro.",
    estimatedCostLow: 0,
    estimatedCostHigh: 0,
    estimatedDurationMinutes: 60,
    hasPriceEstimate: false,
    urgency: "low",
    urgencyReason: "Not enough information to judge urgency yet.",
    recommendedActions: [],
    possibleCauses: [],
    nextSteps: [],
    clarifyingQuestions: ["In a few words, what needs fixing?"],
    serviceOptions: [],
    visionUnavailable: true,
  };
}

function catalogSummary() {
  return catalog
    .map((c) => `${c.slug}: ${c.services.map((s) => s.slug).join(", ")}`)
    .join("\n");
}

export const SYSTEM_PROMPT = `You are GetPros (GetPros.ai), an AI service-discovery assistant for a USA-first home, outdoor, auto and at-home beauty services marketplace. GetPros is NOT a dating service; it connects people with local service professionals.

The customer may send a photo, one or more frames from a short video, a text description, or both. Your job is to work out WHICH SERVICE they need — not to invent faults.

STEP 1 — DETERMINE THE INTENDED VISUAL SUBJECT (before looking for any issue).
If there is a text description, the subject is whatever the customer's words are about — always. Otherwise infer the subject from visual salience: the thing that is centered, prominent, closest to camera, in strongest focus, deliberately framed, held, or clearly placed as the subject of the shot. Everything else — the table it rests on, the floor, the wall behind it, incidental clutter — is CONTEXT ONLY.
- Never diagnose or route based on an incidental background/table/floor/wall scratch, stain or wear when a clearly more salient foreground object is the subject. A wallet on a scratched tabletop means the subject is the WALLET; say nothing about the tabletop unless the customer says the tabletop is the issue.
- A visible problem on a secondary/background object does NOT override a normal-looking main subject.
- Do NOT globally ignore surfaces: if the wall, floor, countertop, tile, lawn, bathroom, roof etc. is itself the dominant deliberately framed subject, it IS the intended subject and should route to the relevant service options.
- If two or more subjects are equally plausible and there is no description, do NOT guess: respond with "needs-info" (or "options") and ask a short question such as "What should GetPros focus on in this photo?".
Set "visualSubject" to a short plain noun phrase for what you focused on (e.g. "Watch", "Wallet", "Kitchen wall", "Bathroom sink"). Use an empty string when there is no image.

If the subject shows no service need, use responseKind "no-issue" with a friendly headline naming it, e.g. "Your watch looks normal from this photo. What would you like help with?", then ask what they'd like done. Only mention services that exist in the catalog below; never invent product-specific services GetPros does not support.

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

PROGRESSION RULES (never trap the customer in a question loop)
- The customer's LATEST message always overrides any earlier guess of yours and any inference from the photo. If they say "TV repair", the service is a repair — not mounting, not installation, not setup — even if the photo shows a wall-mounted TV. Repair, installation/mounting, setup/troubleshooting and cleaning are DIFFERENT services: pick the one their words name.
- Never repeat, rephrase or re-ask a question that has already been asked, and never re-ask something they already answered. Carry every earlier answer forward.
- Ask at most 1-2 short clarifying questions in total across the whole conversation. Once the service is identifiable, STOP asking and resolve: responseKind "diagnosis" with the matching categorySlug/serviceSlug so GetPros can find a professional. Details a pro can collect on site (exact model, symptom specifics, brand) are NOT worth another question — leave them to the pro.
- Do NOT push DIY troubleshooting, self-diagnosis checklists (power/picture/sound/remote/inputs), cable-swapping tips or generic safety lists. GetPros connects people with pros. Only give a safety note for a genuine urgent hazard (gas, live electricity, water on power, fire, structural collapse).
- When the service is known but a fair price range is not, still use responseKind "diagnosis" with hasPriceEstimate false and costs 0 — the customer must still reach a professional.

CATEGORY + SERVICE SLUGS (categorySlug must be one of the category slugs; serviceSlug when used must belong to that category):
${catalogSummary()}

Return ONLY valid minified JSON, no markdown, matching:
{"responseKind":"diagnosis"|"options"|"needs-info"|"no-issue"|"safety-redirect","issueSource":"detected"|"possible"|"customer-described"|"insufficient","headline":string,"visualSubject":string,"category":string,"categorySlug":string,"confidence":number,"problem":string,"estimatedCostLow":number,"estimatedCostHigh":number,"estimatedDurationMinutes":number,"hasPriceEstimate":boolean,"urgency":"low"|"medium"|"high"|"emergency","urgencyReason":string,"recommendedActions":string[],"possibleCauses":string[],"nextSteps":string[],"clarifyingQuestions":string[],"serviceOptions":[{"categorySlug":string,"serviceSlug":string,"label":string,"reason":string}],"safetyNote":string}

Keep every string short and plain-language. Prices are USD typical ranges.`;

export type AnalysisContext = {
  /** Questions GetPros has already put to this customer in this conversation. */
  askedQuestions?: string[];
  /** How many clarification answers the customer has already given. */
  turnCount?: number;
  /** Customer pressed "Find a professional" / "Not sure" — resolve with what we have. */
  forceResolve?: boolean;
  /** The newest thing the customer typed; it outranks every earlier guess. */
  latestMessage?: string;
};

function conversationBlock(ctx?: AnalysisContext) {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.latestMessage?.trim()) {
    parts.push(
      `The customer's LATEST message is: "${ctx.latestMessage.trim()}". It overrides every earlier assumption, including anything inferred from the photo.`,
    );
  }
  if (ctx.askedQuestions?.length) {
    parts.push(
      `You have ALREADY asked: ${ctx.askedQuestions.map((q) => `"${q}"`).join("; ")}. Do not ask these again or reword them.`,
    );
  }
  if (ctx.forceResolve) {
    parts.push(
      `The customer asked to move on and find a professional. Ask NOTHING further: return responseKind "diagnosis" (or "options" only if genuinely two different trades) with the best-fit categorySlug/serviceSlug and leave remaining details for the pro.`,
    );
  } else if ((ctx.turnCount ?? 0) >= 2) {
    parts.push(
      `This is clarification turn ${ctx.turnCount}. No more questions are allowed — resolve to the best-fit service now.`,
    );
  }
  return parts.length ? `\n${parts.join(" ")}` : "";
}

export function buildUserPrompt(
  note: string | undefined,
  hasMedia: boolean,
  frameCount = 1,
  ctx?: AnalysisContext,
) {
  const described = note?.trim();
  const convo = conversationBlock(ctx);
  if (!hasMedia) {
    return `The customer sent NO photo — only this description: "${described}". Work out the service from their words alone.${convo} Respond with JSON only.`;
  }
  const multi = frameCount > 1
    ? ` The ${frameCount} images are frames sampled across one short video of the same scene — read them together, not as separate problems.`
    : "";
  return described
    ? `Customer description (HIGHEST PRIORITY — treat this as the real problem even if the image shows something else): "${described}". Their words define the subject. Use the image only as supporting context.${multi}${convo} Respond with JSON only.`
    : `The customer sent ${frameCount > 1 ? `${frameCount} frames from one short video` : "an image"} with no description. First decide the intended visual subject from salience, then only report a problem if one is genuinely visible on THAT subject. Ignore incidental marks on surrounding surfaces.${multi}${convo} Respond with JSON only.`;
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
  ctx?: AnalysisContext,
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

  const parsedKindRaw: ResponseKind | undefined = parsed.responseKind;
  // The customer's newest words beat any photo inference — "TV repair" must not
  // be answered with TV mounting. Safety redirects are never overridden.
  const latest = ctx?.latestMessage?.trim() ?? "";
  const explicit = parsedKindRaw === "safety-redirect" || !latest ? null : detectServiceIntentInText(latest);

  // Never silently label an unclassified request "Handyman". When the AI gave
  // no valid category, try the customer's own words against the catalog first.
  let inferredService: { categorySlug: string; serviceSlug: string; label: string } | null = null;
  let inferredOptions: ServiceOption[] = [];
  if (explicit) {
    inferredService = {
      categorySlug: explicit.category.slug,
      serviceSlug: explicit.service.slug,
      label: explicit.service.name,
    };
  } else if (!aiCategory && noteText) {
    const hit = detectServiceIntentInText(noteText) ?? matchServiceIntent(noteText);
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

  // The customer asked to move on, or we've already spent our clarification
  // budget: resolve with the best fit instead of asking again.
  const mustResolve = Boolean(ctx?.forceResolve) || (ctx?.turnCount ?? 0) >= 2;
  if (mustResolve && !inferredService && !aiCategory) {
    const fallback = rankServices(latest || noteText, 4);
    if (fallback[0]) {
      inferredService = {
        categorySlug: fallback[0].category.slug,
        serviceSlug: fallback[0].service.slug,
        label: fallback[0].service.name,
      };
      inferredOptions = fallback.slice(1).map((h) => ({
        categorySlug: h.category.slug,
        serviceSlug: h.service.slug,
        label: h.service.name,
        reason: h.category.name,
      }));
    }
  }

  // Empty slug = deliberately unclassified; the UI hides category chips, pricing
  // and pro matches for discovery states.
  const categorySlug = inferredService?.categorySlug ?? aiCategory ?? "";
  const cat = catalog.find((c) => c.slug === categorySlug);
  const unclassified = !categorySlug;
  const parsedKind: ResponseKind | undefined = parsedKindRaw;
  let responseKind: ResponseKind = unclassified
    ? parsedKind === "no-issue" || parsedKind === "safety-redirect"
      ? parsedKind
      : inferredOptions.length > 1
        ? "options"
        : "needs-info"
    : (parsedKind ?? (Object.keys(parsed).length ? "diagnosis" : "needs-info"));
  // An explicit service the customer named, or an exhausted question budget,
  // means we stop clarifying and progress to finding a professional.
  if (categorySlug && responseKind !== "safety-redirect" && (explicit || mustResolve)) {
    responseKind = "diagnosis";
  }
  // Only a confident, single-service diagnosis may carry a price or pro match.
  // options / needs-info / no-issue / safety-redirect are discovery states.
  const categoryChanged = Boolean(explicit && aiCategory && explicit.category.slug !== aiCategory);
  const hasPriceEstimate =
    responseKind === "diagnosis" &&
    Boolean(parsed.hasPriceEstimate ?? true) &&
    Number(parsed.estimatedCostLow ?? 0) > 0 &&
    !categoryChanged;
  const suppressQuestions = responseKind === "diagnosis";
  const alreadyAsked = new Set((ctx?.askedQuestions ?? []).map((q) => q.trim().toLowerCase()));
  const freshQuestions = (
    Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions.filter(Boolean) : []
  )
    .filter((q) => !alreadyAsked.has(String(q).trim().toLowerCase()))
    .slice(0, 2);
  // Nothing new left to ask, but we know the trade: progress instead of stalling.
  if (categorySlug && responseKind === "needs-info" && freshQuestions.length === 0) {
    responseKind = "diagnosis";
  }
  const questions = suppressQuestions || responseKind === "diagnosis" ? [] : freshQuestions;

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
            ? "A few GetPros services could fit — which one sounds right?"
            : cat?.name ?? "Let's narrow this down"),
    category: (inferredService?.label || (aiCategory ? parsed.category?.trim() : "")) || cat?.name || "",
    categorySlug,
    serviceSlug: inferredService?.serviceSlug,

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
    clarifyingQuestions: questions,
    serviceOptions: Array.isArray(parsed.serviceOptions) && parsed.serviceOptions.length
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
      : inferredOptions,

    safetyNote: parsed.safetyNote?.trim() || undefined,
  };
}
