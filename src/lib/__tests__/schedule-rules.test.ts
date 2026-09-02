import { describe, expect, it } from "vitest";
import {
  SERVICE_WINDOW_END_MINUTE,
  SERVICE_WINDOW_START_MINUTE,
  slotsForDate,
  zoneForPlace,
  zonedTimeToUtc,
} from "@/lib/service-hours";

const CENTRAL = "America/Chicago";
// Far enough in the future that lead time never interferes with the assertions.
const notBefore = new Date("2020-01-01T00:00:00Z");

const mondayOnly = [
  { weekday: 1, startMinute: SERVICE_WINDOW_START_MINUTE, endMinute: SERVICE_WINDOW_END_MINUTE },
];

// 2026-03-02 is a Monday; 2026-03-01 is a Sunday.
const MONDAY = "2026-03-02";
const SUNDAY = "2026-03-01";

describe("provider weekly hours are authoritative", () => {
  it("gives no Sunday slots for a Monday-only pro", () => {
    expect(slotsForDate(SUNDAY, { durationMinutes: 60, timeZone: CENTRAL, hours: mondayOnly, notBefore })).toEqual([]);
  });

  it("still gives Monday slots for that pro", () => {
    const slots = slotsForDate(MONDAY, { durationMinutes: 60, timeZone: CENTRAL, hours: mondayOnly, notBefore });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toBe(SERVICE_WINDOW_START_MINUTE);
  });

  it("treats an explicitly empty week as closed, never as all-open", () => {
    for (const day of [SUNDAY, MONDAY]) {
      expect(slotsForDate(day, { durationMinutes: 60, timeZone: CENTRAL, hours: [], notBefore })).toEqual([]);
    }
  });

  it("only falls back to the platform window when no hours are supplied at all", () => {
    const slots = slotsForDate(SUNDAY, { durationMinutes: 60, timeZone: CENTRAL, hours: null, notBefore });
    expect(slots.length).toBeGreaterThan(0);
  });
});

describe("duration and travel buffer", () => {
  const hours = [{ weekday: 1, startMinute: 8 * 60, endMinute: 20 * 60 }];

  it("never starts a job that would end after 8:00 PM", () => {
    const slots = slotsForDate(MONDAY, { durationMinutes: 120, timeZone: CENTRAL, hours, notBefore });
    expect(Math.max(...slots)).toBe(20 * 60 - 120);
  });

  it("keeps the buffer out of the service window but inside the busy check", () => {
    const withBuffer = slotsForDate(MONDAY, {
      durationMinutes: 60, bufferMinutes: 30, timeZone: CENTRAL, hours, notBefore,
    });
    // The buffer may run past 8 PM, so the last start is unchanged by it.
    expect(Math.max(...withBuffer)).toBe(20 * 60 - 60);
  });

  it("blocks a slot whose travel buffer would overlap the next job", () => {
    const nextJobStart = zonedTimeToUtc(MONDAY, 11 * 60, CENTRAL);
    const busy = [{
      startAt: nextJobStart.toISOString(),
      endAt: new Date(nextJobStart.getTime() + 60 * 60_000).toISOString(),
    }];
    const slots = slotsForDate(MONDAY, {
      durationMinutes: 60, bufferMinutes: 30, timeZone: CENTRAL, hours, busy, notBefore,
    });
    // 10:00 + 60 min job + 30 min travel spills into the 11:00 job.
    expect(slots).not.toContain(10 * 60);
    expect(slots).toContain(9 * 60);
  });
});

describe("time off and lead time", () => {
  const hours = [{ weekday: 1, startMinute: 8 * 60, endMinute: 20 * 60 }];

  it("removes slots inside a time-off range", () => {
    const offStart = zonedTimeToUtc(MONDAY, 8 * 60, CENTRAL);
    const timeOff = [{
      startsAt: offStart.toISOString(),
      endsAt: new Date(offStart.getTime() + 4 * 60 * 60_000).toISOString(),
    }];
    const slots = slotsForDate(MONDAY, { durationMinutes: 60, timeZone: CENTRAL, hours, timeOff, notBefore });
    expect(slots.every((m) => m >= 12 * 60)).toBe(true);
  });

  it("never offers a start before the lead-time cutoff", () => {
    const cutoff = zonedTimeToUtc(MONDAY, 13 * 60, CENTRAL);
    const slots = slotsForDate(MONDAY, { durationMinutes: 60, timeZone: CENTRAL, hours, notBefore: cutoff });
    expect(Math.min(...slots)).toBeGreaterThanOrEqual(13 * 60);
  });
});

describe("timezone resolution", () => {
  it("maps a known state to its IANA zone", () => {
    expect(zoneForPlace({ zip: "75034", state: "TX" })).toBe("America/Chicago");
  });

  it("rejects geography we cannot map instead of guessing Central", () => {
    expect(zoneForPlace({ zip: "00000", state: "ZZ" })).toBeNull();
  });

  it("handles DST and non-DST dates in the same zone", () => {
    // Standard time (CST, UTC-6) and daylight time (CDT, UTC-5).
    expect(zonedTimeToUtc("2026-01-12", 9 * 60, CENTRAL).toISOString()).toBe("2026-01-12T15:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-13", 9 * 60, CENTRAL).toISOString()).toBe("2026-07-13T14:00:00.000Z");
  });

  it("keeps Arizona on standard time all year", () => {
    const az = "America/Phoenix";
    expect(zonedTimeToUtc("2026-01-12", 9 * 60, az).toISOString()).toBe("2026-01-12T16:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-13", 9 * 60, az).toISOString()).toBe("2026-07-13T16:00:00.000Z");
  });
});
