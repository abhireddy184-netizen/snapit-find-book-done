/**
 * GPB service scheduling rules — US launch.
 *
 * Hard platform window: 08:00–20:00 in the SERVICE LOCATION's local time.
 * The whole job (duration + travel/setup buffer) has to fit inside it, so a
 * 60-minute job can start at 19:00 at the latest.
 *
 * Timezones are IANA zones derived from the validated service ZIP, so DST and
 * non-DST regions (Arizona, Hawaii) are handled by the runtime, never by a
 * fixed UTC offset and never by the customer's device timezone — someone in
 * New York booking a job in Phoenix is scheduled in Phoenix time.
 */

import { extractZip, isZipCode, lookupZip, lookupZipSync, type ZipPlace } from "@/lib/us-zip";

export const SERVICE_WINDOW_START_MINUTE = 8 * 60; // 08:00 local
export const SERVICE_WINDOW_END_MINUTE = 20 * 60; // 20:00 local
export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_TRAVEL_BUFFER_MINUTES = 15;

/* --------------------------------------------------------------- timezones */

const EASTERN = "America/New_York";
const CENTRAL = "America/Chicago";
const MOUNTAIN = "America/Denver";
const PACIFIC = "America/Los_Angeles";

/** Primary IANA zone per US state/territory. */
const STATE_ZONE: Record<string, string> = {
  AL: CENTRAL, AK: "America/Anchorage", AZ: "America/Phoenix", AR: CENTRAL, CA: PACIFIC,
  CO: MOUNTAIN, CT: EASTERN, DE: EASTERN, DC: EASTERN, FL: EASTERN, GA: EASTERN,
  HI: "Pacific/Honolulu", ID: MOUNTAIN, IL: CENTRAL, IN: EASTERN, IA: CENTRAL, KS: CENTRAL,
  KY: EASTERN, LA: CENTRAL, ME: EASTERN, MD: EASTERN, MA: EASTERN, MI: EASTERN, MN: CENTRAL,
  MS: CENTRAL, MO: CENTRAL, MT: MOUNTAIN, NE: CENTRAL, NV: PACIFIC, NH: EASTERN, NJ: EASTERN,
  NM: MOUNTAIN, NY: EASTERN, NC: EASTERN, ND: CENTRAL, OH: EASTERN, OK: CENTRAL, OR: PACIFIC,
  PA: EASTERN, RI: EASTERN, SC: EASTERN, SD: CENTRAL, TN: CENTRAL, TX: CENTRAL, UT: MOUNTAIN,
  VT: EASTERN, VA: EASTERN, WA: PACIFIC, WV: EASTERN, WI: CENTRAL, WY: MOUNTAIN,
  PR: "America/Puerto_Rico", VI: "America/St_Thomas",
};

/**
 * ZIP-prefix overrides for states that straddle a zone boundary. Keyed by the
 * first three ZIP digits — the coarsest split that is still accurate for the
 * populated areas of each boundary.
 */
const ZIP3_ZONE: Record<string, string> = {
  // Florida panhandle
  "324": CENTRAL, "325": CENTRAL,
  // West Texas
  "798": MOUNTAIN, "799": MOUNTAIN, "885": MOUNTAIN,
  // Western Kansas / Nebraska / Dakotas
  "677": MOUNTAIN, "679": MOUNTAIN, "691": MOUNTAIN, "693": MOUNTAIN,
  "577": MOUNTAIN, "586": MOUNTAIN,
  // Northwest + southwest Indiana run on Central
  "463": CENTRAL, "464": CENTRAL, "476": CENTRAL, "477": CENTRAL, "478": CENTRAL,
  // Western Kentucky
  "420": CENTRAL, "421": CENTRAL, "422": CENTRAL, "423": CENTRAL, "424": CENTRAL, "425": CENTRAL, "426": CENTRAL, "427": CENTRAL,
  // East Tennessee
  "373": EASTERN, "374": EASTERN, "376": EASTERN, "377": EASTERN, "378": EASTERN, "379": EASTERN,
  // Upper Peninsula Michigan (Menominee county)
  "498": CENTRAL, "499": CENTRAL,
  // Eastern Oregon / northern Idaho
  "979": MOUNTAIN, "838": PACIFIC,
};

/**
 * IANA timezone for a validated US ZIP place, or null when we cannot map the
 * place to a zone we trust. We never guess: an unknown territory is reported
 * as unsupported rather than silently scheduled in Central time.
 */
export function zoneForPlace(place: Pick<ZipPlace, "zip" | "state">): string | null {
  const zip3 = place.zip.slice(0, 3);
  return ZIP3_ZONE[zip3] ?? STATE_ZONE[place.state.toUpperCase()] ?? null;
}

export type ServiceLocation = {
  zip: string;
  city: string;
  state: string;
  timeZone: string;
  /** Human label used in the UI, e.g. "Frisco, TX 75034". */
  label: string;
};

function toServiceLocation(place: ZipPlace): ServiceLocation | null {
  const timeZone = zoneForPlace(place);
  if (!timeZone) return null;
  return {
    zip: place.zip,
    city: place.city,
    state: place.state,
    timeZone,
    label: `${place.city}, ${place.state} ${place.zip}`,
  };
}

/**
 * Resolve a free-text service address to a US service location.
 * Returns null when no US ZIP can be validated — we never guess coordinates
 * and never fall back to the device timezone for someone else's city.
 */
export async function resolveServiceLocation(address: string): Promise<ServiceLocation | null> {
  const zip = isZipCode(address) ? address.trim() : extractZip(address);
  if (!zip) return null;
  const place = await lookupZip(zip);
  return place ? toServiceLocation(place) : null;
}

export function resolveServiceLocationSync(address: string): ServiceLocation | null {
  const zip = isZipCode(address) ? address.trim() : extractZip(address);
  if (!zip) return null;
  const place = lookupZipSync(zip);
  return place ? toServiceLocation(place) : null;
}

/* ------------------------------------------------------- zoned time helpers */

const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = OFFSET_FORMATTERS.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    OFFSET_FORMATTERS.set(timeZone, f);
  }
  return f;
}

/** Wall-clock fields of an instant inside a timezone. */
export function zonedParts(instant: Date, timeZone: string) {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const hour = get("hour") % 24; // Intl can emit 24 for midnight
  return {
    year: get("year"), month: get("month"), day: get("day"),
    hour, minute: get("minute"),
    date: `${String(get("year")).padStart(4, "0")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`,
    minutes: hour * 60 + get("minute"),
  };
}

/**
 * The UTC instant for a local wall time in a timezone.
 * DST-safe: solved by iteration, so it is correct across spring-forward and
 * fall-back and for zones that never shift (Phoenix, Honolulu).
 */
export function zonedTimeToUtc(isoDate: string, minutesOfDay: number, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  const wanted = Date.UTC(y, m - 1, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  let guess = new Date(wanted);
  for (let i = 0; i < 3; i += 1) {
    const p = zonedParts(guess, timeZone);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const drift = wanted - actual;
    if (drift === 0) break;
    guess = new Date(guess.getTime() + drift);
  }
  return guess;
}

/** "YYYY-MM-DD" for right now in a timezone. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  return zonedParts(now, timeZone).date;
}

export function addDaysIso(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T12:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatSlot(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* --------------------------------------------------------------- slot rules */

export type WeeklyHours = { weekday: number; startMinute: number; endMinute: number };
export type TimeOff = { startsAt: string; endsAt: string };

export type SlotOptions = {
  /** On-site service length. Must fit the platform window and the pro's hours. */
  durationMinutes: number;
  /** Travel/setup time held after the job. Blocks the pro but may run past hours. */
  bufferMinutes?: number;
  timeZone: string;
  /**
   * The pro's weekly hours. An array — including an empty one — is
   * AUTHORITATIVE: a weekday with no row is a closed day and yields no slots.
   * Pass `undefined`/`null` only when no pro is chosen yet and the caller
   * deliberately wants the bare platform window.
   */
  hours?: WeeklyHours[] | null;
  timeOff?: TimeOff[];
  /** Already-taken [start,end) instants for this provider, buffer included. */
  busy?: { startAt: string; endAt: string }[];
  /** Earliest bookable moment (lead time already applied). */
  notBefore?: Date;
  stepMinutes?: number;
};

/** Latest start minute allowed by the platform window for a given length. */
export function latestStartMinute(totalMinutes: number): number {
  return SERVICE_WINDOW_END_MINUTE - totalMinutes;
}

function weekdayForDate(isoDate: string): number {
  // The weekday belongs to the calendar date itself, so noon UTC is safe.
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

/** Bookable start minutes for one local date, honouring every rule. */
export function slotsForDate(isoDate: string, opts: SlotOptions): number[] {
  const {
    durationMinutes, bufferMinutes = 0, timeZone, hours, timeOff = [], busy = [],
    notBefore = new Date(), stepMinutes = 30,
  } = opts;

  const weekday = weekdayForDate(isoDate);

  // An hours array is authoritative: no row for this weekday means closed.
  // Only an explicitly absent array falls back to the bare platform window.
  const source = hours == null
    ? [{ weekday, startMinute: SERVICE_WINDOW_START_MINUTE, endMinute: SERVICE_WINDOW_END_MINUTE }]
    : hours.filter((h) => h.weekday === weekday);

  // Provider hours may narrow the platform window, never extend it.
  // The occupied block — job PLUS travel/setup buffer — has to fit; a pro is
  // never held past 8:00 PM local or past the end of their own working day.
  const occupiedMinutes = durationMinutes + bufferMinutes;
  const ranges = source
    .map((h) => ({
      start: Math.max(h.startMinute, SERVICE_WINDOW_START_MINUTE),
      end: Math.min(h.endMinute, SERVICE_WINDOW_END_MINUTE),
    }))
    .filter((r) => r.end - r.start >= occupiedMinutes);

  const offRanges = timeOff.map((t) => [Date.parse(t.startsAt), Date.parse(t.endsAt)] as const);
  const busyRanges = busy.map((b) => [Date.parse(b.startAt), Date.parse(b.endAt)] as const);
  const out: number[] = [];

  for (const range of ranges) {
    for (let m = range.start; m + occupiedMinutes <= range.end; m += stepMinutes) {
      const startUtc = zonedTimeToUtc(isoDate, m, timeZone).getTime();
      const occupiedEndUtc = startUtc + occupiedMinutes * 60_000;
      if (startUtc < notBefore.getTime()) continue;
      if (offRanges.some(([s, e]) => startUtc < e && occupiedEndUtc > s)) continue;
      if (busyRanges.some(([s, e]) => startUtc < e && occupiedEndUtc > s)) continue;
      out.push(m);
    }
  }
  return out.sort((a, b) => a - b);
}

/** First bookable slot within `daysAhead` days, or null when there is none. */
export function nextAvailableSlot(
  opts: SlotOptions & { fromDate?: string; daysAhead?: number },
): { date: string; minute: number } | null {
  const from = opts.fromDate ?? todayInZone(opts.timeZone, opts.notBefore ?? new Date());
  const days = opts.daysAhead ?? 14;
  for (let i = 0; i <= days; i += 1) {
    const date = addDaysIso(from, i);
    const slots = slotsForDate(date, opts);
    if (slots[0] != null) return { date, minute: slots[0] };
  }
  return null;
}

/** Explain why a chosen local time is not bookable — plain language, no jargon. */
export function windowViolation(minute: number, totalMinutes: number): string | null {
  if (minute < SERVICE_WINDOW_START_MINUTE) return "GPB pros start at 8:00 AM local time.";
  if (minute + totalMinutes > SERVICE_WINDOW_END_MINUTE) {
    return `This job needs about ${totalMinutes} minutes, so the latest start today is ${formatSlot(latestStartMinute(totalMinutes))} local time.`;
  }
  return null;
}
