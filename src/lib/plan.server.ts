import { catalog } from "./catalog";
import { matchServiceIntent, rankServices } from "./search-intent";
import {
  dayGap,
  formatClock,
  isIsoDate,
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

export const UNDERSTAND_SYSTEM_PROMPT = `You are GPB's universal language understanding layer. You receive ONE real-world request that a person typed or spoke. Treat the input as fully language-agnostic: it may be in ANY human language, dialect or regional variety, written in ANY Unicode script, romanized/transliterated into Latin letters (phonetic spelling of a non-English language, e.g. "inti daggara", "ghar ke paas", "vanakkam"), written in a mix of native script and Latin letters, or mixing two or more languages inside one sentence. It may contain slang, dialect words, misspellings, broken grammar, missing articles or tense, filler words, incomplete phrases, or imperfect voice-transcription noise. Never assume a fixed list of supported languages; any examples given here are illustrative only. Do not rely on phrase dictionaries — infer the underlying language and meaning from phonetics, morphology and context.

YOUR JOB: convert it into a canonical intent the planner can act on, WITHOUT losing or inventing meaning.

RULES
1. Understand by MEANING, never by grammar or keyword matching. "Me airport go 6, before food eat, grocery pickup also" = eat first, then pick up groceries on the way, then reach the airport by 6 PM.
2. Preserve EVERY hard constraint exactly as stated: clock times and whether AM/PM was stated, deadlines, dates, city/airport/neighbourhood names, named businesses, people's names or relationships, quantities, pickup vs dropoff, and the order of events. Never silently add a constraint the person did not state.
3. Repair only obvious transcription noise (e.g. "D F W" -> "DFW"). If a proper noun is uncertain, keep it as heard rather than replacing it with a guess.
4. Write "normalizedRequest" in clear ENGLISH for the planner (an internal canonical form), listing the tasks in intended order and stating each hard constraint explicitly. This is internal only; it is never shown to the user.
5. Detect the language actually used, whatever it is. "languageCode" = best-effort BCP-47/ISO code of the DOMINANT language (any language, not only common ones). "languageName" = its name written in that language, in the same script the user wrote in. "codeSwitched" = true when two or more languages are genuinely mixed.
6. Detect HOW it was written and report it as "script": "native" when the language's own script is used, "latin" when a non-English language is romanized/transliterated into Latin letters, "mixed" when both appear. If the text is genuine English, set languageCode "en" and script "native" — do NOT misclassify ordinary English as transliteration just because some words look phonetic. Judge by whether the words actually mean something in English as written.
7. "confidence" 0-1: how sure you are of the intent. Grammar problems, romanization, dialect or misspellings alone should NOT lower confidence. Lower it only when the actual meaning is unclear.
8. Ask for clarification ONLY when a single critical detail would materially change execution and cannot be inferred: an impossible-to-infer AM vs PM, two genuinely plausible airports/cities, pickup vs dropoff, or which person. In that case set "criticalAmbiguity" (short, English, internal) and "clarificationQuestion" (ONE short question written in the USER'S OWN language AND their own script/romanization style). Otherwise leave both as empty strings. Never ask about minor uncertainty; a sensible default is better than a question.
9. LOW CONFIDENCE (you genuinely cannot tell what was said or which language it is): do NOT translate it into something plausible and do NOT guess a different language. Keep the original wording untouched inside "normalizedRequest", set a low "confidence", and ask ONE short clarification written in the same language/script the user appears to have used (plain English only if even that is unclear).
10. CASUAL PREAMBLE: people often open with teasing, jokes, greetings, self-talk or thinking-aloud before the real ask ("hey what's up man, anyway — I need 2 kg potatoes"). Ignore the preamble as content, but DO extract the real task that follows or precedes it. Never let a joking or informal tone turn into "no task".
11. QUANTITIES AND ITEMS: keep every item, quantity, unit and brand exactly as stated ("2 kg potatoes" stays 2 kg potatoes — not "some potatoes", not 2 lb, not "vegetables"). Convert nothing.
12. ACTIONABILITY. Set "actionability":
   - "actionable" when the PERSON asks for a real-world task, errand, favour, purchase, delivery, appointment, repair, outing or coordination to do — even a very small one, and even when buried in chatter. This includes broad everyday plans that are not services at all: catching a flight, running errands, a round of golf or a sports outing, helping a friend, a day out. Plan those as ordinary steps.
   - "conversational" when the message is only a greeting, a joke, a test question, small talk, an insult, teasing, or a general/curious question with NO task for GPB to carry out. Examples of conversational: "what's up", "who are you", "ఏం కావాలి రా?" ("what do you want?"), "are you real", "just testing".
   When "conversational": write "conversationalReply" — ONE or TWO short, warm, PLAYFUL sentences that actually answer what they said, in the user's own language AND script/romanization style. Light humour is welcome and a single friendly emoji (e.g. 😄 🙂 👋) may be added when the tone is casual — but NEVER in a serious, distressed, urgent, emergency, medical, safety or complaint context, where the reply must be plain, calm and helpful. Vary the humour to fit what they actually said; never reuse a stock joke, and never repeat the same joke twice. Then write "invitation" — one short friendly line inviting them to say what they need done, same language and style. Never mock, scold, lecture, moralise, or ask a pile of questions. When "conversational", still fill languageCode/languageName/script normally and leave clarificationQuestion empty.
   When "actionable", leave "conversationalReply" and "invitation" as empty strings.
13. YOUR OWN WORDS ARE NEVER THE USER'S REQUEST. Anything GPB previously said — including a joke GPB made, such as offering to fetch two kilos of potatoes — is assistant banter, not a task. Only what the PERSON asked for counts. If the person asks a casual question and GPB's own playful answer mentions items, that is still "conversational" with no task. Plan an item purchase ONLY when the person themselves genuinely asks for it.
14. Never invent a travel plan, airport run or demo scenario that the person did not ask for. If they asked only for groceries, the intent is only groceries.
15. STYLE OF EVERY REPLY YOU WRITE. Mirror the person's own mix: if they code-switch (e.g. Telugu + English), reply in that same natural mix, keeping the everyday English words they would keep — "నీ airport trip కోసం చిన్న plan సిద్ధం చేశాను. Pickup location చెప్పు." If they spoke only one language, reply only in that language. Keep it to one or two short sentences.
16. PLAIN TEXT ONLY — never write markdown or markup in any string: no **bold**, no *, _, #, backticks, bullets, links or HTML.

Return ONLY minified JSON, no markdown:
{"languageCode":string,"languageName":string,"script":"native"|"latin"|"mixed","codeSwitched":boolean,"actionability":"actionable"|"conversational","normalizedRequest":string,"confidence":number,"criticalAmbiguity":string,"clarificationQuestion":string,"conversationalReply":string,"invitation":string}`;

export function buildUnderstandUserPrompt(
  request: string,
  location: string,
  nowClock: string,
  nowDate?: string,
  timeZone?: string,
) {
  return [
    `Raw request (verbatim): "${request}"`,
    location ? `Location context: ${location}` : "No location given.",
    `Current local time is roughly ${formatClock(parseClock(nowClock))}${nowDate ? ` on ${nowDate}` : ""}${timeZone ? ` (${timeZone})` : ""}.`,
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
  const rawScript = str("script").toLowerCase();
  const script =
    rawScript === "latin" || rawScript === "mixed" || rawScript === "native"
      ? (rawScript as "latin" | "mixed" | "native")
      : undefined;
  // Low confidence must never silently become a confident mistranslation: fall
  // back to the user's verbatim words as the canonical intent.
  const normalized = str("normalizedRequest");
  const reply = str("conversationalReply").slice(0, 300);
  const invitation = str("invitation").slice(0, 160);
  // Only treat it as small talk when the model both said so AND wrote a reply —
  // otherwise a real request would silently get no plan.
  const conversational = str("actionability").toLowerCase() === "conversational" && Boolean(reply);
  return {
    languageCode: str("languageCode").slice(0, 12) || "en",
    languageName: str("languageName").slice(0, 40) || "English",
    codeSwitched: Boolean(p['codeSwitched']),
    ...(script ? { script } : {}),
    normalizedRequest: (confidence < 0.35 ? `${request}${normalized ? ` (uncertain reading: ${normalized})` : ""}` : normalized) || request,
    confidence,
    actionability: conversational ? "conversational" : "actionable",
    ...(conversational ? { conversationalReply: reply } : {}),
    ...(conversational && invitation ? { invitation } : {}),
    // Only surface a question when it is tied to a genuinely critical ambiguity.
    ...(!conversational && ambiguity && question ? { criticalAmbiguity: ambiguity, clarificationQuestion: question } : {}),
  };
}


/* ================= stage 2 — planning ================= */

export const PLAN_SYSTEM_PROMPT = `You are GPB (GetPerfectBoy.com), a real-world execution planner. GPB is NOT a dating service and NOT a single-service directory: the customer describes an OUTCOME or a whole part of their day, and you turn it into ONE coordinated plan of linked tasks with sequencing and timing.

PLAN ANYTHING EVERYDAY, NOT JUST SERVICES
- The request may be a plain part of someone's life: catching a flight, a run of errands, a favour for a friend, a round of golf or a sports outing, a day out, a family visit. Plan those as ordinary, human steps.
- NEVER force a non-service activity into a service category. "Play 18 holes", "meet Ravi at the clubhouse" or "watch the match" are "user-action" steps with no categorySlug — they are not something to book a pro for.
- Only attach a "gpb-pro" step where a real professional genuinely helps that outcome (e.g. a car wash before the drive, a house clean while you are out). Add helpful service steps where they fit, and leave them out where they do not.
- Keep the sequence short and obvious. Fewer, clearer steps beat exhaustive ones.

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

TIMING AND DATES
- ONLY THE CUSTOMER SETS A TARGET TIME. Set "deadline" and "deadlineStated":true ONLY when the customer themselves stated a hard time they must meet ("by 6 PM", "before 8:30", "my flight is at 7"). Then work backwards, leaving bufferMinutes (15-25) of safety before it.
- If they did NOT state a time, leave "deadline" as an empty string and "deadlineStated":false. NEVER invent a target, closing time, arrival time or end time. An untimed outing ("I want to go to a sports bar", "let's play golf") is a flexible ordered plan with no deadline and no buffer.
- The END of an outing is NOT a deadline. Being somewhere by a stated time is a deadline; leaving a bar afterwards is not.
- If a time would genuinely help ("tonight", "tomorrow night" with no hour), keep the plan flexible and put ONE short question in "clarifyTitle"-style wording via "notes" — e.g. "When would you like to go?" — instead of guessing an hour.
- "tomorrow night" / "tonight" set the DATE, not a clock time: keep tomorrow's date in the customer's own timezone and still leave the deadline empty.
- TRAVEL TIMES ARE ESTIMATES. GPB has no live routing data, so never present a travel or wait duration as exact — word it as an estimate in the task detail.
- Set "startClock" as 24h "HH:MM" for when the plan should begin.

- DATES MATTER. You are given today's date. If the request names a future date or day ("September 13", "Saturday", "tomorrow"), set "startDate" and "deadlineDate" as "YYYY-MM-DD" for the day the work and the deadline actually fall on. NEVER schedule a future-dated plan as if it started at the current clock time today, and never mark a future deadline as already missed.
- If no date is stated, set "startDate" and "deadlineDate" to today's date (or tomorrow's when the stated time has clearly already passed today).
- FLIGHTS: a flight departure time is NOT the deadline. The deadline is being at the airport ahead of departure — typically 2 hours before for domestic and 3 hours for international — plus travel time. Say plainly in the task detail which time is departure and which is airport arrival.
- Do not invent constraints (no invented check-in times, gates, or bookings) and do not add days the customer never mentioned.
- If the chronology the customer stated is impossible (deadline earlier than the work can start, or a date already in the past), do not silently "fix" it: build the closest honest plan and add one short note in "notes" explaining the conflict.
- Never promise anything is booked. This is a plan, not a confirmation.


HONESTY RULES
- Never claim a partnership, live tracking, or a confirmed booking.
- Never invent faults, prices, or providers.
- Only use categorySlug/serviceSlug values from the catalog below, and only for "gpb-pro" tasks.

LANGUAGE OF THE OUTPUT (critical)
- You are given the customer's VERBATIM request, a canonical English restatement of it, and the detected language.
- Every customer-facing string you write — outcome, summary, task titles, details, locationNote, notes, bookingDisclaimer, partnerDisclaimer and every value in uiCopy — MUST be written in the customer's own language (the detected language). If the request was code-switched, write in that same natural mixed style.
- MIRROR THE CUSTOMER'S SCRIPT AND STYLE. If they wrote in their language's own script, reply in that script. If they wrote their language romanized in Latin letters (transliteration), reply in the SAME natural romanized style — do not surprise them by switching to a script they did not use. If they mixed scripts or languages, mix in the same natural proportion. If the style is unclear, prefer the script the customer actually used; if still unclear, plain English is the safe fallback.
- This applies to ANY language, dialect or regional variety — never fall back to English just because a language is uncommon.
- Never translate away named places, businesses or people: keep them as the customer said them.
- Machine values (id, channel, categorySlug, serviceSlug, times, numbers) stay in English/ASCII and must never be translated.
- "uiCopy" is short interface wording for the plan screen (page title, intro line, input placeholders, buttons, card labels); write EVERY value in the customer's language. If the customer's language is English, return the English wording. Keep each value under ~8 words so it fits small phone screens. "pageIntro" is one short sentence reminding them they can change the order/timing and that nothing is booked. "snapCtaTitle"/"snapCtaBody" invite sending a photo or video instead; "earlyCtaTitle"/"earlyCtaBody" invite joining early access, launching city by city.
- UNITS: "minutesShort" is the short word for minutes in the customer's language (English "min"). "spareSuffix" and "overSuffix" are ONLY the trailing words "spare" / "over" in their language — they must NOT contain the minutes unit or a number, because the UI renders "<number> <minutesShort> <suffix>". "durationLabel" is the word for duration. Never leave a bare number without its unit.
- NATURAL CODE-SWITCHING. When the customer mixes their language with English (very common with Telugu, Hindi, Tamil, Tagalog, Arabic and others), write back in that same natural mix, keeping the everyday English words they themselves would keep — e.g. "నీ airport trip కోసం చిన్న plan సిద్ధం చేశాను. Pickup location చెప్పు." Do not translate ordinary loanwords like airport, pickup, plan, booking into heavy formal vocabulary, and do not force a mix on someone who spoke only one language.
- PLAIN TEXT ONLY. Never write markdown or any markup in any string: no **bold**, no *, _, #, backticks, bullet dashes, links or HTML. The interface handles all styling. Write short plain sentences; one idea per string.
- TONE. Warm, brief and clear. Short sentences, minimal words, no filler. An occasional light smiley is fine in casual contexts, never in urgent, medical, safety or complaint ones.




MEANING FIRST
- Infer intent from meaning, never grammar. Keep every hard constraint (times, AM/PM, deadlines, locations, people, quantities, pickup vs dropoff, order).
- Do not invent details the customer did not say. If something is still open, put it in "notes" — do not stall.

CATALOG (categorySlug: serviceSlugs)
${catalogSummary()}

Return ONLY minified JSON, no markdown:
{"outcome":string,"summary":string,"deadline":string,"deadlineStated":boolean,"startClock":string,"startDate":string,"deadlineDate":string,"bufferMinutes":number,"tasks":[{"id":string,"title":string,"detail":string,"channel":string,"categorySlug":string,"serviceSlug":string,"durationMinutes":number,"parallel":boolean,"dependsOn":[string],"locationNote":string}],"notes":[string],"bookingDisclaimer":string,"partnerDisclaimer":string,"uiCopy":{"stepsHeading":string,"stepsHint":string,"resetLabel":string,"editLabel":string,"doneLabel":string,"skipLabel":string,"restoreLabel":string,"durationLabel":string,"minutesShort":string,"findProLabel":string,"planStartsLabel":string,"targetLabel":string,"planEndsLabel":string,"stepsLabel":string,"bufferLabel":string,"tasksWord":string,"spareSuffix":string,"overSuffix":string,"detailsHeading":string,"clarifyTitle":string,"clarifyHint":string,"clarifyPlaceholder":string,"clarifySubmit":string,"clarifyDismiss":string,"pageTitle":string,"pageIntro":string,"requestPlaceholder":string,"locationPlaceholder":string,"buildLabel":string,"errorTitle":string,"retryLabel":string,"snapCtaTitle":string,"snapCtaBody":string,"earlyCtaTitle":string,"earlyCtaBody":string}}
Keep every string short and plain-language.`;

export function buildPlanUserPrompt(
  request: string,
  location: string,
  nowClock: string,
  understanding?: PlanUnderstanding,
  nowDate?: string,
  timeZone?: string,
) {
  return [
    `Customer request (verbatim, in their own words): "${request}"`,
    understanding
      ? `Canonical intent (internal English restatement — use for meaning, never copy its wording into output): "${understanding.normalizedRequest}"`
      : "",
    understanding
      ? `Detected language: ${understanding.languageName} (${understanding.languageCode})${understanding.codeSwitched ? " — code-switched/mixed; mirror that mixed style" : ""}. Writing style: ${
          understanding.script === "latin"
            ? "romanized/transliterated in Latin letters — reply in the SAME romanized style, do not switch to another script"
            : understanding.script === "mixed"
              ? "mixed native script and Latin letters — mirror that same mixed style"
              : "the language's own script — reply in that script"
        }. Write ALL customer-facing text in this language and style.`
      : "",
    location ? `Location context: ${location}` : "No location given.",
    `Current local time is roughly ${formatClock(parseClock(nowClock))}${nowDate ? `, today's date is ${nowDate}` : ""}${timeZone ? `, customer time zone ${timeZone}` : ""}.`,
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
  nowDate?: string,
  timeZone?: string,
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
      ...(nowDate ? { startDate: nowDate } : {}),
      ...(timeZone ? { timeZone } : {}),
      bufferMinutes: 20,
      tasks,
      notes: [],
      source: "fallback",
      originalRequest: request,
      ...(understanding ? { understanding } : {}),
    },
    nowClock,
    nowDate,
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

/**
 * Order, time and caveat a plan so the UI always gets a coherent object.
 *
 * Date-aware: a deadline on a later calendar day is measured from the plan's own
 * start day, so a 8:00 PM target next week is never treated as "already past"
 * tonight, and the plan is only pinned to the current clock when it starts today.
 */
export function finalizePlan(plan: GpbPlan, nowClock: string, nowDate?: string): GpbPlan {
  const tasks = resequence(plan.tasks);
  const total = tasks.reduce(
    (max, t) => Math.max(max, t.startOffsetMinutes + t.durationMinutes),
    0,
  );

  const startDate = isIsoDate(plan.startDate) ? plan.startDate : isIsoDate(nowDate) ? nowDate : undefined;
  const deadlineDate = isIsoDate(plan.deadlineDate) ? plan.deadlineDate : startDate;
  const startsToday = !startDate || !isIsoDate(nowDate) || startDate === nowDate;

  let startClock = plan.startClock || nowClock;
  if (plan.deadline) {
    // Deadline relative to the plan's start day; a later date adds whole days.
    const deadlineAbs = parseClock(plan.deadline) + dayGap(startDate, deadlineDate) * 1440;
    const latestStart = deadlineAbs - plan.bufferMinutes - total;
    // Only "no earlier than now" when the plan actually runs today.
    const earliest = startsToday ? parseClock(nowClock) : 0;
    startClock = toClockString(
      Math.max(0, Math.max(earliest, Math.min(parseClock(startClock), latestStart))),
    );
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

  return withReplan({
    ...plan,
    tasks,
    startClock,
    ...(startDate ? { startDate } : {}),
    ...(plan.deadline && deadlineDate ? { deadlineDate } : {}),
    notes: [...notes],
  });

}


/* ---------------- AI output normalizer ---------------- */

type RawTask = Partial<PlanTask> & { channel?: string };

export function normalizePlan(
  raw: string,
  request: string,
  location: string,
  nowClock: string,
  understanding?: PlanUnderstanding,
  nowDate?: string,
  timeZone?: string,
): GpbPlan {

  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(match ? match[0] : raw) as Record<string, unknown>;
  } catch {
    return buildFallbackPlan(request, location, nowClock, understanding, nowDate, timeZone);
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

  if (!tasks.length) return buildFallbackPlan(request, location, nowClock, understanding, nowDate, timeZone);

  // A target time may only come from the customer. The model must flag whether
  // the deadline was actually stated; anything it invents is discarded so an
  // untimed outing ("I want to go to a sports bar") never gets a fake target,
  // a fake buffer, or an "over" warning measured against it.
  const deadlineStated = parsed['deadlineStated'] === true;
  const rawDeadline =
    typeof parsed['deadline'] === "string" && /^\d{1,2}:\d{2}$/.test(parsed['deadline'] as string)
      ? toClockString(parseClock(parsed['deadline'] as string))
      : // English regex is a last-resort fallback only; the canonical intent above
        // is what carries non-English deadlines.
        extractDeadline(understanding?.normalizedRequest ?? request);
  const regexDeadline = extractDeadline(understanding?.normalizedRequest ?? request);
  const deadline = deadlineStated || regexDeadline ? rawDeadline : undefined;


  const isoDate = (k: string) => {
    const v = parsed[k];
    return typeof v === "string" && isIsoDate(v.trim()) ? v.trim() : undefined;
  };
  const startDate = isoDate("startDate") ?? nowDate;
  const deadlineDate = isoDate("deadlineDate") ?? startDate;



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
      ...(startDate ? { startDate } : {}),
      ...(deadline && deadlineDate ? { deadlineDate } : {}),
      ...(timeZone ? { timeZone } : {}),
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
    nowDate,
  );

}
