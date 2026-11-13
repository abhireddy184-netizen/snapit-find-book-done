/**
 * GetPros ProConnect — admin-only Pro recruitment tracker.
 * Pure, browser-safe helpers. There is NO telephony integration: nothing here
 * places calls. Activation is blocked until a voice provider is connected by a
 * developer AND every compliance item is confirmed.
 */

/** No voice/phone provider is integrated. Flip only when a real, authorized integration ships. */
export const TELEPHONY_CONNECTED = false as const;

export const DFW_CITIES = [
  "Dallas", "Fort Worth", "Arlington", "Plano", "Irving", "Garland", "Frisco", "McKinney",
  "Grand Prairie", "Mesquite", "Carrollton", "Denton", "Richardson", "Lewisville", "Allen",
] as const;

export const LEAD_STATUSES = [
  "new", "contacted", "no_answer", "voicemail", "interested", "not_interested", "follow_up", "signed_up", "do_not_call",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New", contacted: "Contacted", no_answer: "No answer", voicemail: "Voicemail", interested: "Interested",
  not_interested: "Not interested", follow_up: "Follow-up", signed_up: "Signed up", do_not_call: "Do not call",
};

export const CALL_OUTCOMES = ["no_answer", "voicemail", "interested", "not_interested", "follow_up", "opted_out"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const OUTCOME_LABEL: Record<CallOutcome | "note", string> = {
  no_answer: "No answer", voicemail: "Left voicemail", interested: "Interested", not_interested: "Not interested",
  follow_up: "Asked for follow-up", opted_out: "Opted out (do not call)", note: "Note",
};

export type ConsentStatus = "unknown" | "granted" | "revoked";

export type LeadLike = {
  status: string; consent_status: string; do_not_call: boolean; is_demo: boolean;
  next_follow_up_at: string | null; signed_up_user_id?: string | null;
};

/** Mirrors the database gate: may a simulated call be logged for this lead? */
export function simulationBlockReason(lead: LeadLike): string | null {
  if (lead.do_not_call || lead.consent_status === "revoked") return "On the do-not-call list.";
  if (!lead.is_demo && lead.consent_status !== "granted") return "Record call consent first.";
  return null;
}

export const COMPLIANCE_ITEMS = [
  { key: "tcpa_reviewed", label: "TCPA / Texas telemarketing rules reviewed by counsel" },
  { key: "dnc_registry_scrub", label: "National & Texas Do-Not-Call registry scrubbing in place" },
  { key: "written_consent_capture", label: "Prior express written consent captured for every number" },
  { key: "calling_hours_policy", label: "Calling-hours policy (recipient local time) enforced" },
  { key: "ai_disclosure_script", label: "Script discloses it's an AI assistant and offers opt-out" },
  { key: "recording_consent_policy", label: "Call recording consent policy approved" },
] as const;
export type ComplianceKey = (typeof COMPLIANCE_ITEMS)[number]["key"];
export type ComplianceSettings = Record<ComplianceKey, boolean>;

export function activationReadiness(settings: Partial<ComplianceSettings> | null, telephonyConnected: boolean = TELEPHONY_CONNECTED) {
  const missing: string[] = [];
  if (!telephonyConnected) missing.push("Phone/voice provider is not connected");
  for (const item of COMPLIANCE_ITEMS) if (!settings?.[item.key]) missing.push(item.label);
  return { ready: missing.length === 0, missing };
}

export type Metrics = {
  total: number; real: number; demo: number; consented: number; doNotCall: number;
  contacted: number; interested: number; signedUp: number; followUpsDue: number; conversionRate: number;
};

const CONTACTED = new Set(["contacted", "no_answer", "voicemail", "interested", "not_interested", "follow_up", "signed_up"]);

export function computeMetrics(leads: LeadLike[], now: Date = new Date()): Metrics {
  const real = leads.filter((l) => !l.is_demo);
  const signedUp = real.filter((l) => l.status === "signed_up" || !!l.signed_up_user_id).length;
  return {
    total: leads.length,
    real: real.length,
    demo: leads.length - real.length,
    consented: real.filter((l) => l.consent_status === "granted" && !l.do_not_call).length,
    doNotCall: leads.filter((l) => l.do_not_call).length,
    contacted: real.filter((l) => CONTACTED.has(l.status)).length,
    interested: real.filter((l) => l.status === "interested").length,
    signedUp,
    followUpsDue: leads.filter((l) => !l.do_not_call && l.next_follow_up_at && new Date(l.next_follow_up_at) <= now).length,
    conversionRate: real.length ? Math.round((signedUp / real.length) * 1000) / 10 : 0,
  };
}

export type ScriptVars = { contactName?: string | null; businessName: string; category: string; city: string };

export function buildScript(lang: "en" | "es", v: ScriptVars): string[] {
  const name = v.contactName?.trim() || (lang === "es" ? "hola" : "there");
  if (lang === "es") {
    return [
      `Hola ${name}, le habla el asistente de IA de GetPros, no una persona. ¿Tiene un minuto?`,
      `Llamo porque ${v.businessName} ofrece servicios de ${v.category} en ${v.city}, y GetPros está sumando profesionales en Dallas–Fort Worth.`,
      `No cobramos por contactos: usted conserva el 85% de cada trabajo.`,
      `¿Le envío un enlace para registrarse en getpros.ai?`,
      `Si prefiere que no le llamemos más, dígalo y lo quitamos de nuestra lista de inmediato.`,
    ];
  }
  return [
    `Hi ${name}, this is the GetPros AI assistant — not a live person. Do you have a minute?`,
    `I'm calling because ${v.businessName} offers ${v.category} in ${v.city}, and GetPros is adding pros across Dallas–Fort Worth.`,
    `There are no lead fees: you keep 85% of every job.`,
    `Can I text or email you a link to sign up at getpros.ai?`,
    `If you'd rather not get calls from us, just say so and we'll remove you right away.`,
  ];
}

/** Text-only simulated call — never dials anyone. */
export function simulateTranscript(lang: "en" | "es", v: ScriptVars, outcome: CallOutcome): string {
  const lines = buildScript(lang, v).map((l) => `AI: ${l}`);
  const reply: Record<CallOutcome, string> = {
    no_answer: "[No answer — call not connected]",
    voicemail: "[Voicemail — AI left a short message with opt-out instructions]",
    interested: "Pro: Yes, send me the link.",
    not_interested: "Pro: No thanks, not right now.",
    follow_up: "Pro: Call me back next week.",
    opted_out: "Pro: Please don't call me again. → Added to do-not-call.",
  };
  if (outcome === "no_answer") return `[SIMULATION] ${reply.no_answer}`;
  if (outcome === "voicemail") return `[SIMULATION] ${reply.voicemail}`;
  return ["[SIMULATION — no real call placed]", lines[0], lines[1], lines[2], reply[outcome]].join("\n");
}
