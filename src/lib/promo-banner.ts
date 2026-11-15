/**
 * Founding Pros seasonal offer strip. Pure date rules so they can be tested.
 * All instants are America/Chicago wall-clock times converted to UTC
 * (Chicago is on CST, UTC-6, for this whole window).
 */
export const PROMO_LABEL_SWITCH_AT = Date.UTC(2026, 10, 28, 6, 0, 0); // Nov 28, 2026 00:00 Chicago
export const PROMO_ENDS_AT = Date.UTC(2027, 0, 1, 5, 59, 0); // Dec 31, 2026 11:59 PM Chicago
export const PROMO_DISMISS_KEY = "getpros:promo-founding-pros:dismissed";
export const PROMO_CTA_URL = "https://getpros.ai/register?role=provider";

export function promoVisible(now: number): boolean {
  return now < PROMO_ENDS_AT;
}

export function promoLabel(now: number): "BLACK FRIDAY" | "HOLIDAY OFFER" {
  return now >= PROMO_LABEL_SWITCH_AT ? "HOLIDAY OFFER" : "BLACK FRIDAY";
}

export function promoCountdown(now: number) {
  const ms = Math.max(0, PROMO_ENDS_AT - now);
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
