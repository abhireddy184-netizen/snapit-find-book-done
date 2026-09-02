import { describe, expect, it } from "vitest";
import { PLAN_SYSTEM_PROMPT, extractDeadline, normalizePlan } from "../plan.server";
import { addDays, planDeadlineMinutes } from "../plan-model";

const NOW = "22:56";
const TODAY = "2026-09-02";

function raw(overrides: Record<string, unknown>) {
  return JSON.stringify({
    outcome: "Sports bar night",
    summary: "A simple order of steps.",
    tasks: [
      { id: "t1", title: "Get ready", channel: "user-action", durationMinutes: 30 },
      { id: "t2", title: "Ride there", channel: "ride-partner", durationMinutes: 20 },
      { id: "t3", title: "Watch the game", channel: "user-action", durationMinutes: 120 },
    ],
    ...overrides,
  });
}

describe("untimed plans never get an invented target", () => {
  it("drops a deadline the model invented for an untimed outing", () => {
    const plan = normalizePlan(
      raw({ deadline: "22:30", deadlineStated: false, startClock: NOW }),
      "I want to go to a sports bar",
      "",
      NOW,
      undefined,
      TODAY,
    );
    expect(plan.deadline).toBeUndefined();
    expect(planDeadlineMinutes(plan)).toBeNull();
  });

  it("keeps a deadline the customer actually stated", () => {
    const plan = normalizePlan(
      raw({ deadline: "18:00", deadlineStated: true, startClock: "15:00" }),
      "I need to be at the bar by 6 PM",
      "",
      "14:00",
      undefined,
      TODAY,
    );
    expect(plan.deadline).toBe("18:00");
  });

  it("still honours a stated time even when the model forgets the flag", () => {
    const plan = normalizePlan(
      raw({ deadline: "", deadlineStated: false, startClock: "15:00" }),
      "get me there by 6 PM",
      "",
      "14:00",
      undefined,
      TODAY,
    );
    expect(plan.deadline).toBe("18:00");
    expect(extractDeadline("get me there by 6 PM")).toBe("18:00");
  });
});

describe("plan prompt rules", () => {
  it("forbids inventing a target and an end-of-outing deadline", () => {
    expect(PLAN_SYSTEM_PROMPT).toMatch(/NEVER invent a target/i);
    expect(PLAN_SYSTEM_PROMPT).toMatch(/The END of an outing is NOT a deadline/i);
  });

  it("keeps 'tomorrow night' as a date, not an invented hour", () => {
    expect(PLAN_SYSTEM_PROMPT).toMatch(/tomorrow night.*set the DATE, not a clock time/i);
  });

  it("marks travel durations as estimates rather than routed facts", () => {
    expect(PLAN_SYSTEM_PROMPT).toMatch(/TRAVEL TIMES ARE ESTIMATES/i);
  });
});

describe("crossing midnight", () => {
  it("moves the calendar day forward for a plan that ends after midnight", () => {
    expect(addDays(TODAY, 1)).toBe("2026-09-03");
    expect(addDays(undefined, 1)).toBeUndefined();
  });
});
