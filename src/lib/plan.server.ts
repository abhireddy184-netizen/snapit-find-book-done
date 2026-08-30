import { catalog } from "./catalog";
import { matchServiceIntent, rankServices } from "./search-intent";
import {
  formatClock,
  parseClock,
  resequence,
  toClockString,
  type ExecutionChannel,
  type GpbPlan,
  type PlanTask,
  type PlanUiCopy,
  type PlanUnderstanding,
} from "./plan-model";

const CATEGORY_SLUGS = new Set(catalog.map((c) => c.slug));
const CHANNELS: ExecutionChannel[] = [
  "gpb-pro",
  "food-partner",
  "grocery-partner",
  "ride-partner",
  "user-action",
  "not-supported",
];

function catalogSummary() {
  return catalog.map((c) => `${c.slug}: ${c.services.map((s) => s.slug).join(", ")}`).join("\n");
}

/* ================= stage 1 — universal language understanding ================= */

export const UNDERSTAND_SYSTEM_PROMPT = `You are GPB's universal language understanding layer. You receive ONE real-world request that a person typed or spoke. It may be in ANY language on earth, in a mix of languages (code-switching such as Telugu+English, Hindi+English, Kannada+English, Malayalam+English, Tamil+English, Spanish+English), in a regional script or romanized, with a strong accent transcribed imperfectly, with broken grammar, slang, filler words, missing articles or tense, or as an incomplete phrase.

YOUR JOB: convert it into a canonical intent the planner can act on, WITHOUT losing or inventing meaning.

RULES
1. Understand by MEANING, never by grammar or keyword matching. "Me airport go 6, before food eat, grocery pickup also" = eat first, then pick up groceries on the way, then reach the airport by 6 PM.
2. Preserve EVERY hard constraint exactly as stated: clock times and whether AM/PM was stated, deadlines, dates, city/airport/neighbourhood names, named businesses, people's names or relationships, quantities, pickup vs dropoff, and the order of events. Never silently add a constraint the person did not state.
3. Repair only obvious transcription noise (e.g. "D F W" -> "DFW"). If a proper noun is uncertain, keep it as heard rather than replacing it with a guess.
4. Write "normalizedRequest" in clear ENGLISH for the planner (an internal canonical form), listing the tasks in intended order and stating each hard constraint explicitly. This is internal only; it is never shown to the user.
5. Detect the language actually used. "languageCode" = best-effort code of the DOMINANT language ("te", "hi", "kn", "ml", "ta", "es", "en", ...). "languageName" = its name written in that language. "codeSwitched" = true when two or more languages are genuinely mixed.
6. "confidence" 0-1: how sure you are of the intent. Grammar problems alone should NOT lower confidence.
7. Ask for clarification ONLY when a single critical detail would materially change execution and cannot be inferred: an impossible-to-infer AM vs PM, two genuinely plausible airports/cities, pickup vs dropoff, or which person. In that case set "criticalAmbiguity" (short, English, internal) and "clarificationQuestion" (ONE short question written in the USER'S OWN language / code-switched style). Otherwise leave both as empty strings. Never ask about minor uncertainty; a sensible default is better than a question.

Return ONLY minified JSON, no markdown:
{"languageCode":string,"languageName":string,"codeSwitched":boolean,"normalizedRequest":string,"confidence":number,"criticalAmbiguity":string,"clarificationQuestion":string}`;

export function buildUnderstandUserPrompt(request: string, location: string, nowClock: string) {
  return [
    `Raw request (verbatim): "${request}"`,
    location ? `Location context: ${location}` : "No location given.",
    `Current local time is roughly ${formatClock(parseClock(nowClock))}.`,
    "Return JSON only.",
  ].join("\n");
}

/** Parse the understanding stage; always returns something usable. */
export function normalizeUnderstanding(raw: string, request: string): PlanUnderstanding {
  const match = raw.match(/\{[\s\S]*\}/);
  let p: Record<string, unknown> = {};
  try {
    p = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
  } catch {
    p = {};
  }
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string).trim() : "");
  const confidence = Math.min(1, Math.max(0, Number(p['confidence'] ?? 0.7)));
  const ambiguity = str("criticalAmbiguity");
  const question = str("clarificationQuestion");
  return {
    languageCode: str("languageCode").slice(0, 12) || "en",
    languageName: str("languageName").slice(0, 40) || "English",
    codeSwitched: Boolean(p['codeSwitched']),
    normalizedRequest: str("normalizedRequest") || request,
    confidence,
    // Only surface a question when it is tied to a genuinely critical ambiguity.
    ...(ambiguity && question ? { criticalAmbiguity: ambiguity, clarificationQuestion: question } : {}),
  };
}

/* ================= stage 2 — planning ================= */

export const PLAN_SYSTEM_PROMPT = `You are GPB (GetPerfectBoy.com), a real-world execution planner. GPB is NOT a dating service and NOT a single-service directory: the customer describes an OUTCOME or a whole part of their day, and you turn it into ONE coordinated plan of linked tasks with sequencing and timing.

Break the request into 2-8 child tasks. For each task decide:
- title: short imperative outcome ("Deep clean the apartment", "Grocery pickup on the way").
- channel, exactly one of:
  * "gpb-pro" — a local service professional GPB can route to (cleaning, handyman, moving, auto, lawn, beauty-at-home, errands, etc.). Use a categorySlug/serviceSlug from the catalog below.
  * "food-partner" — prepared food / restaurant ordering (future partner integration).
  * "grocery-partner" — grocery pickup or delivery (future partner integration).
  * "ride-partner" — rides, airport transport, driving someone (future partner integration).
  * "user-action" — something only the customer can do (leave home, be at the gate, unlock the door).
  * "not-supported" — GPB cannot coordinate it. Be honest rather than inventing capability.
- durationMinutes: realistic, including travel where the task involves moving.
- parallel: true when it can run at the same time as the previous task, false when it must follow it.
- dependsOn: ids of tasks that must finish first (use the ids you assign).
- locationNote: short route/location hint when relevant ("On route to DFW", "At home").

TIMING
- If the request names a hard deadline (e.g. "by 6 PM", "before 8:30"), set "deadline" as 24h "HH:MM" and work backwards, leaving bufferMinutes (15-25) of safety before it.
- Set "startClock" as 24h "HH:MM" for when the plan should begin.
- Never promise anything is booked. This is a plan, not a confirmation.

HONESTY RULES
- Never claim a partnership, live tracking, or a confirmed booking.
- Never invent faults, prices, or providers.
- Only use categorySlug/serviceSlug values from the catalog below, and only for "gpb-pro" tasks.

LANGUAGE OF THE OUTPUT (critical)
- You are given the customer's VERBATIM request, a canonical English restatement of it, and the detected language.
- Every customer-facing string you write — outcome, summary, task titles, details, locationNote, notes, bookingDisclaimer, partnerDisclaimer and every value in uiCopy — MUST be written in the customer's own language (the detected language). If the request was code-switched, write in that same natural mixed style.
- Never translate away named places, businesses or people: keep them as the customer said them.
- Machine values (id, channel, categorySlug, serviceSlug, times, numbers) stay in English/ASCII and must never be translated.
- "uiCopy" is short interface wording for the plan screen; translate each value into the customer's language. If the customer's language is English, return the English wording.

MEANING FIRST
- Infer intent from meaning, never grammar. Keep every hard constraint (times, AM/PM, deadlines, locations, people, quantities, pickup vs dropoff, order).
- Do not invent details the customer did not say. If something is still open, put it in "notes" — do not stall.

CATALOG (categorySlug: serviceSlugs)
${catalogSummary()}

Return ONLY minified JSON, no markdown:
{"outcome":string,"summary":string,"deadline":string,"startClock":string,"bufferMinutes":number,"tasks":[{"id":string,"title":string,"detail":string,"channel":string,"categorySlug":string,"serviceSlug":string,"durationMinutes":number,"parallel":boolean,"dependsOn":[string],"locationNote":string}],"notes":[string],"bookingDisclaimer":string,"partnerDisclaimer":string,"uiCopy":{"stepsHeading":string,"stepsHint":string,"resetLabel":string,"editLabel":string,"doneLabel":string,"skipLabel":string,"restoreLabel":string,"durationLabel":string,"minutesShort":string,"findProLabel":string,"planStartsLabel":string,"targetLabel":string,"planEndsLabel":string,"stepsLabel":string,"bufferLabel":string,"tasksWord":string,"spareSuffix":string,"overSuffix":string,"detailsHeading":string,"clarifyTitle":string,"clarifyHint":string,"clarifyPlaceholder":string,"clarifySubmit":string,"clarifyDismiss":string}}
Keep every string short and plain-language.`;

export function buildPlanUserPrompt(
  request: string,
  location: string,
  nowClock: string,
  understanding?: PlanUnderstanding,
) {
  return [
    `Customer request (verbatim, in their own words): "${request}"`,
    understanding
      ? `Canonical intent (internal English restatement — use for meaning, never copy its wording into output): "${understanding.normalizedRequest}"`
      : "",
    understanding
      ? `Detected language: ${understanding.languageName} (${understanding.languageCode})${understanding.codeSwitched ? " — code-switched/mixed; mirror that mixed style" : ""}. Write ALL customer-facing text in this language.`
      : "",
    location ? `Location context: ${location}` : "No location given.",
    `Current local time is roughly ${formatClock(parseClock(nowClock))}.`,
    "Return JSON only.",
  ]
    .filter(Boolean)
    .join("\n");
}


/* ---------------- deterministic fallback ---------------- */

const DEADLINE_RE = /\bby\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;

export function extractDeadline(text: string): string | undefined {
  const m = DEADLINE_RE.exec(text) ?? TIME_RE.exec(text);
  if (!m) return undefined;
  let h = Number(m[1]);
  const mins = Number(m[2] ?? 0);
  const mer = (m[3] ?? "").toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  if (!mer && h <= 11) h += 12; // "by 6" in a day plan almost always means evening
  if (h > 23) return undefined;
  return toClockString(h * 60 + mins);
}

const FOOD_RE = /\b(food|dinner|lunch|breakfast|eat|meal|takeout|take-out|restaurant|hungry|coffee)\b/i;
const GROCERY_RE = /\b(grocer\w*|supermarket|walmart|costco|target run|shopping list)\b/i;
const RIDE_RE = /\b(airport|dfw|dal|flight|terminal|ride|drive me|drop me|pick (?:me|them|him|her) up|get to|station)\b/i;

function splitFragments(request: string): string[] {
  return request
    .split(/[,.;\n]|\band then\b|\bthen\b|\band also\b|\band\b|\bplus\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 8);
}

function channelFor(fragment: string): ExecutionChannel | null {
  if (GROCERY_RE.test(fragment)) return "grocery-partner";
  if (FOOD_RE.test(fragment)) return "food-partner";
  if (RIDE_RE.test(fragment)) return "ride-partner";
  return null;
}

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

/** Rule-based plan used when AI is unavailable or returns nothing usable. */
export function buildFallbackPlan(
  request: string,
  location: string,
  nowClock: string,
  understanding?: PlanUnderstanding,
): GpbPlan {
  const fragments = splitFragments(request);
  const tasks: PlanTask[] = [];

  for (const fragment of fragments) {
    const partner = channelFor(fragment);
    if (partner) {
      tasks.push({
        id: nextId("t"),
        title:
          partner === "food-partner"
            ? "Food sorted"
            : partner === "grocery-partner"
              ? "Grocery run"
              : "Transport",
        detail: fragment,
        channel: partner,
        startOffsetMinutes: 0,
        durationMinutes: partner === "ride-partner" ? 35 : partner === "grocery-partner" ? 20 : 25,
        parallel: false,
        status: "planned",
        ...(partner === "grocery-partner" ? { swappable: true } : {}),
        ...(location ? { locationNote: location } : {}),
      });
      continue;
    }

    const hit = matchServiceIntent(fragment) ?? rankServices(fragment, 1)[0];
    if (hit) {
      tasks.push({
        id: nextId("t"),
        title: hit.service.name,
        detail: fragment,
        channel: "gpb-pro",
        categorySlug: hit.category.slug,
        serviceSlug: hit.service.slug,
        startOffsetMinutes: 0,
        durationMinutes: 90,
        parallel: false,
        status: "planned",
        ...(location ? { locationNote: location } : {}),
      });
      continue;
    }

    tasks.push({
      id: nextId("t"),
      title: fragment.length > 48 ? `${fragment.slice(0, 46)}…` : fragment,
      detail: "GPB will confirm what this needs before anything is booked.",
      channel: "user-action",
      startOffsetMinutes: 0,
      durationMinutes: 30,
      parallel: false,
      status: "planned",
    });
  }

  if (!tasks.length) {
    tasks.push({
      id: nextId("t"),
      title: request.slice(0, 60) || "Your request",
      detail: "Tell GPB a little more and we'll break this into steps.",
      channel: "user-action",
      startOffsetMinutes: 0,
      durationMinutes: 30,
      parallel: false,
      status: "planned",
    });
  }

  return finalizePlan(
    {
      outcome: request.trim(),
      summary: "GPB drafted this plan from your request. Adjust the order, timing or steps — nothing is booked.",
      location,
      startClock: nowClock,
      bufferMinutes: 20,
      tasks,
      notes: [],
      source: "fallback",
      originalRequest: request,
      ...(understanding ? { understanding } : {}),
    },
    nowClock,
  );
}

/* ---------------- shared finishing pass ---------------- */

function isEnglish(plan: GpbPlan) {
  const code = plan.understanding?.languageCode ?? "en";
  return !code || code.toLowerCase().startsWith("en");
}

function withReplan(plan: GpbPlan): GpbPlan {
  const swappable = plan.tasks.find((t) => t.channel === "grocery-partner" || t.swappable);
  const hasRide = plan.tasks.some((t) => t.channel === "ride-partner");
  // The simulated traffic re-plan copy only exists in English; suppress it rather
  // than leaking English into a non-English plan.
  if (!swappable || !hasRide || !plan.deadline || !isEnglish(plan)) return plan;
  return {
    ...plan,
    tasks: plan.tasks.map((t) => (t.id === swappable.id ? { ...t, swappable: true } : t)),
    replan: {
      headline: "Traffic increased by 18 minutes",
      body: `Your ${swappable.title.toLowerCase()} stop may put the ${formatClock(parseClock(plan.deadline))} arrival at risk. Switch it to delivery and travel directly instead?`,
      applyLabel: "Apply change",
      keepLabel: "Keep current plan",
      delayMinutes: 18,
    },
  };
}

/** Order, time and caveat a plan so the UI always gets a coherent object. */
export function finalizePlan(plan: GpbPlan, nowClock: string): GpbPlan {
  const tasks = resequence(plan.tasks);
  const total = tasks.reduce(
    (max, t) => Math.max(max, t.startOffsetMinutes + t.durationMinutes),
    0,
  );

  let startClock = plan.startClock || nowClock;
  if (plan.deadline) {
    const latestStart = parseClock(plan.deadline) - plan.bufferMinutes - total;
    const earliest = parseClock(nowClock);
    startClock = toClockString(Math.max(earliest, Math.min(parseClock(startClock), latestStart)));
  }

  // Disclaimers come from the planner in the customer's own language; the
  // English strings are a fallback only.
  const notes = new Set(plan.notes.filter(Boolean));
  notes.add(
    plan.bookingDisclaimer?.trim() ||
      "This is a plan, not a confirmed booking. Nothing has been ordered or dispatched.",
  );
  if (tasks.some((t) => !["gpb-pro", "user-action"].includes(t.channel))) {
    notes.add(
      plan.partnerDisclaimer?.trim() ||
        "Food, grocery and ride steps sit in GPB's expanding orchestration network — those partner integrations are not live yet.",
    );
  }

  return withReplan({ ...plan, tasks, startClock, notes: [...notes] });
}


/* ---------------- AI output normalizer ---------------- */

type RawTask = Partial<PlanTask> & { channel?: string };

export function normalizePlan(
  raw: string,
  request: string,
  location: string,
  nowClock: string,
  understanding?: PlanUnderstanding,
): GpbPlan {

  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
  } catch {
    return buildFallbackPlan(request, location, nowClock, understanding);
  }

  const rawTasks = Array.isArray(parsed['tasks']) ? (parsed['tasks'] as RawTask[]) : [];
  const tasks: PlanTask[] = rawTasks
    .filter((t) => t && typeof t.title === "string" && t.title.trim())
    .slice(0, 8)
    .map((t, i) => {
      const channel = (CHANNELS as string[]).includes(t.channel ?? "")
        ? (t.channel as ExecutionChannel)
        : "user-action";
      const categorySlug =
        channel === "gpb-pro" && t.categorySlug && CATEGORY_SLUGS.has(t.categorySlug)
          ? t.categorySlug
          : undefined;
      const serviceSlug =
        categorySlug &&
        catalog.find((c) => c.slug === categorySlug)?.services.some((s) => s.slug === t.serviceSlug)
          ? t.serviceSlug
          : undefined;
      return {
        id: typeof t.id === "string" && t.id ? t.id : `t-${i + 1}`,
        title: String(t.title).trim().slice(0, 80),
        ...(t.detail ? { detail: String(t.detail).trim().slice(0, 180) } : {}),
        channel,
        ...(categorySlug ? { categorySlug } : {}),
        ...(serviceSlug ? { serviceSlug } : {}),
        startOffsetMinutes: 0,
        durationMinutes: Math.min(600, Math.max(0, Math.round(Number(t.durationMinutes ?? 30)))),
        parallel: Boolean(t.parallel) && i > 0,
        ...(Array.isArray(t.dependsOn) ? { dependsOn: t.dependsOn.slice(0, 4) } : {}),
        ...(t.locationNote ? { locationNote: String(t.locationNote).slice(0, 60) } : {}),
        status: "planned" as const,
      };
    });

  if (!tasks.length) return buildFallbackPlan(request, location, nowClock, understanding);

  const deadline =
    typeof parsed['deadline'] === "string" && /^\d{1,2}:\d{2}$/.test(parsed['deadline'] as string)
      ? toClockString(parseClock(parsed['deadline'] as string))
      : // English regex is a last-resort fallback only; the canonical intent above
        // is what carries non-English deadlines.
        extractDeadline(understanding?.normalizedRequest ?? request);

  const rawCopy = (parsed['uiCopy'] ?? {}) as Record<string, unknown>;
  const copy: PlanUiCopy = {};
  for (const [k, v] of Object.entries(rawCopy)) {
    if (typeof v === "string" && v.trim()) (copy as Record<string, string>)[k] = v.trim().slice(0, 60);
  }
  const str = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "");

  return finalizePlan(
    {
      outcome: (typeof parsed['outcome'] === "string" && parsed['outcome'].trim()) || request.trim(),
      summary:
        (typeof parsed['summary'] === "string" && parsed['summary'].trim()) ||
        "One outcome, broken into linked steps you can adjust.",
      location,
      ...(deadline ? { deadline } : {}),
      startClock:
        typeof parsed['startClock'] === "string" && /^\d{1,2}:\d{2}$/.test(parsed['startClock'])
          ? toClockString(parseClock(parsed['startClock']))
          : nowClock,
      bufferMinutes: Math.min(45, Math.max(10, Math.round(Number(parsed['bufferMinutes'] ?? 20)))),
      tasks,
      notes: Array.isArray(parsed['notes'])
        ? (parsed['notes'] as unknown[]).filter((n): n is string => typeof n === "string").slice(0, 3)
        : [],
      source: "ai",
      originalRequest: request,
      ...(understanding ? { understanding } : {}),
      ...(Object.keys(copy).length ? { uiCopy: copy } : {}),
      ...(str("bookingDisclaimer") ? { bookingDisclaimer: str("bookingDisclaimer") } : {}),
      ...(str("partnerDisclaimer") ? { partnerDisclaimer: str("partnerDisclaimer") } : {}),
    },
    nowClock,

  );
}
