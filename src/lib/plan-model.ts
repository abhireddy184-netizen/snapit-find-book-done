/**
 * GPB V3 orchestration model — a single outcome broken into linked, timed tasks.
 *
 * Pure, browser-safe helpers only. The AI prompt + normalizer live in
 * plan.server.ts; the server function lives in plan.functions.ts.
 */

export type ExecutionChannel =
  | "gpb-pro"
  | "food-partner"
  | "grocery-partner"
  | "ride-partner"
  | "user-action"
  | "not-supported";

export type PlanTaskStatus = "planned" | "skipped";

export type PlanTask = {
  id: string;
  title: string;
  detail?: string;
  channel: ExecutionChannel;
  categorySlug?: string;
  serviceSlug?: string;
  /** Minutes after the plan start time that this task begins. */
  startOffsetMinutes: number;
  durationMinutes: number;
  /** Runs alongside the previous task instead of after it. */
  parallel: boolean;
  dependsOn?: string[];
  locationNote?: string;
  status: PlanTaskStatus;
  /** Prototype hook: this task is the one a re-plan suggestion would swap. */
  swappable?: boolean;
};

export type ReplanSuggestion = {
  headline: string;
  body: string;
  applyLabel: string;
  keepLabel: string;
  /** Minutes of delay the suggestion is reacting to. */
  delayMinutes: number;
};

/**
 * Language + understanding metadata produced by the normalization stage that
 * runs before planning. Kept separate from the plan body so the original user
 * wording is always preserved for display/audit.
 */
export type PlanUnderstanding = {
  /** BCP-47-ish code, best effort (e.g. "te", "hi", "en", "es"). */
  languageCode: string;
  /** Human-readable language name, in the user's own language when possible. */
  languageName: string;
  /** True when the request mixes languages (code-switching). */
  codeSwitched: boolean;
  /** Canonical, meaning-preserving restatement of the request for the planner. */
  normalizedRequest: string;
  /** 0-1 confidence that the intent was understood correctly. */
  confidence: number;
  /** Short description of a critical ambiguity, when one exists. */
  criticalAmbiguity?: string;
  /** One concise question, in the user's language, when confirmation is required. */
  clarificationQuestion?: string;
};

/**
 * Language-aware UI copy returned by the planner so the plan page can speak the
 * user's language without maintaining a hard-coded translation table.
 * Every field is optional; the UI falls back to English.
 */
export type PlanUiCopy = Partial<{
  stepsHeading: string;
  stepsHint: string;
  resetLabel: string;
  editLabel: string;
  doneLabel: string;
  skipLabel: string;
  restoreLabel: string;
  durationLabel: string;
  minutesShort: string;
  findProLabel: string;
  planStartsLabel: string;
  targetLabel: string;
  planEndsLabel: string;
  stepsLabel: string;
  bufferLabel: string;
  tasksWord: string;
  spareSuffix: string;
  overSuffix: string;
  detailsHeading: string;
  clarifyTitle: string;
  clarifyHint: string;
  clarifyPlaceholder: string;
  clarifySubmit: string;
  clarifyDismiss: string;
}>;

export const DEFAULT_UI_COPY: Required<PlanUiCopy> = {
  stepsHeading: "Your steps",
  stepsHint: "Reorder, skip or restore any step.",
  resetLabel: "Reset plan",
  editLabel: "Edit",
  doneLabel: "Done",
  skipLabel: "Skip",
  restoreLabel: "Restore",
  durationLabel: "Duration",
  minutesShort: "min",
  findProLabel: "Find a pro",
  planStartsLabel: "Plan starts",
  targetLabel: "Target",
  planEndsLabel: "Plan ends",
  stepsLabel: "Steps",
  bufferLabel: "Buffer",
  tasksWord: "tasks",
  spareSuffix: "min spare",
  overSuffix: "min over",
  detailsHeading: "How this will be handled",
  clarifyTitle: "One detail to confirm",
  clarifyHint: "Answer in any language — GPB will rebuild the plan.",
  clarifyPlaceholder: "Your answer…",
  clarifySubmit: "Update plan",
  clarifyDismiss: "Keep as is",
};

export function uiCopy(plan: Pick<GpbPlan, "uiCopy">): Required<PlanUiCopy> {
  return { ...DEFAULT_UI_COPY, ...(plan.uiCopy ?? {}) };
}

export type GpbPlan = {
  outcome: string;
  summary: string;
  location: string;
  /** Target arrival/completion as "HH:MM" 24h, when the request has one. */
  deadline?: string;
  /** Plan start as "HH:MM" 24h. */
  startClock: string;
  bufferMinutes: number;
  tasks: PlanTask[];
  notes: string[];
  replan?: ReplanSuggestion;
  source: "ai" | "fallback" | "demo";
  /** Exactly what the user typed/said, never rewritten. */
  originalRequest?: string;
  understanding?: PlanUnderstanding;
  uiCopy?: PlanUiCopy;
  /** Localized "nothing is booked" disclaimer. */
  bookingDisclaimer?: string;
  /** Localized partner-integration disclaimer. */
  partnerDisclaimer?: string;
};


/* ---------------- channel presentation ---------------- */

export const CHANNEL_META: Record<
  ExecutionChannel,
  { label: string; short: string; live: boolean; blurb: string }
> = {
  "gpb-pro": {
    label: "GPB local pro",
    short: "GPB pro",
    live: true,
    blurb: "Links into the current GPB service catalogue and provider booking flow.",
  },
  "food-partner": {
    label: "Food partner",
    short: "Food",
    live: false,
    blurb: "Food ordering is part of GPB's expanding orchestration network — not yet a live integration.",
  },
  "grocery-partner": {
    label: "Grocery partner",
    short: "Grocery",
    live: false,
    blurb: "Grocery pickup/delivery is a planned partner integration — not yet connected.",
  },
  "ride-partner": {
    label: "Ride partner",
    short: "Ride",
    live: false,
    blurb: "Ride and transport is a planned partner integration — not yet connected.",
  },
  "user-action": {
    label: "You",
    short: "You",
    live: true,
    blurb: "A step only you can do. GPB times it around everything else.",
  },
  "not-supported": {
    label: "Not yet supported",
    short: "Not yet",
    live: false,
    blurb: "GPB can't coordinate this one yet — we'll tell you rather than pretend.",
  },
};

/* ---------------- time helpers ---------------- */

export function parseClock(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 12 * 60;
  return Math.min(24 * 60 - 1, Number(m[1]) * 60 + Number(m[2]));
}

export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const mm = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function toClockString(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Recompute offsets from ordering + parallel flags, skipping skipped tasks. */
export function resequence(tasks: PlanTask[]): PlanTask[] {
  let cursor = 0;
  let previousStart = 0;
  return tasks.map((t) => {
    if (t.status === "skipped") return { ...t, startOffsetMinutes: cursor };
    const start = t.parallel ? previousStart : cursor;
    previousStart = start;
    cursor = Math.max(cursor, start + t.durationMinutes);
    return { ...t, startOffsetMinutes: start };
  });
}

export function planEndMinutes(plan: GpbPlan): number {
  const start = parseClock(plan.startClock);
  const active = plan.tasks.filter((t) => t.status !== "skipped");
  if (!active.length) return start;
  return start + Math.max(...active.map((t) => t.startOffsetMinutes + t.durationMinutes));
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/* ---------------- the demo airport journey ---------------- */

export function demoAirportPlan(): GpbPlan {
  const tasks: PlanTask[] = [
    {
      id: "t-food",
      title: "Dinner ordered and ready",
      detail: "Early dinner so you're not eating at the gate.",
      channel: "food-partner",
      startOffsetMinutes: 0,
      durationMinutes: 25,
      parallel: false,
      status: "planned",
      locationNote: "Near home",
    },
    {
      id: "t-leave",
      title: "Leave home",
      detail: "GPB sets off time from your grocery stop and traffic estimate.",
      channel: "user-action",
      startOffsetMinutes: 25,
      durationMinutes: 15,
      parallel: false,
      dependsOn: ["t-food"],
      status: "planned",
    },
    {
      id: "t-grocery",
      title: "Grocery pickup on the way",
      detail: "Order placed ahead so it's bagged and waiting.",
      channel: "grocery-partner",
      startOffsetMinutes: 40,
      durationMinutes: 15,
      parallel: false,
      dependsOn: ["t-leave"],
      status: "planned",
      locationNote: "On route to DFW",
      swappable: true,
    },
    {
      id: "t-drive",
      title: "Head to the airport",
      detail: "Drive or ride to DFW terminal.",
      channel: "ride-partner",
      startOffsetMinutes: 55,
      durationMinutes: 30,
      parallel: false,
      dependsOn: ["t-grocery"],
      status: "planned",
      locationNote: "DFW International",
    },
    {
      id: "t-arrive",
      title: "Airport arrival",
      detail: "Lands you at the terminal with a 20 minute buffer before 6:00 PM.",
      channel: "user-action",
      startOffsetMinutes: 85,
      durationMinutes: 0,
      parallel: false,
      dependsOn: ["t-drive"],
      status: "planned",
    },
  ];

  return {
    outcome: "Get me fed, pick up groceries, and get me to DFW by 6.",
    summary:
      "One plan, four moving parts: dinner, a grocery stop that stays on your route, the drive, and a buffer before your 6:00 PM target.",
    location: "Dallas–Fort Worth, TX",
    deadline: "18:00",
    startClock: "16:15",
    bufferMinutes: 20,
    tasks,
    notes: [
      "Example plan shown for demonstration — nothing here is booked.",
      "Food, grocery and ride steps are planned partner integrations, not live bookings.",
    ],
    replan: {
      headline: "Traffic increased by 18 minutes",
      body: "Your grocery stop may put the 6:00 PM airport arrival at risk. Switch groceries to delivery at home and go directly to the airport?",
      applyLabel: "Apply change",
      keepLabel: "Keep current plan",
      delayMinutes: 18,
    },
    source: "demo",
  };
}
