/** US-first phone normalization to E.164 (+1XXXXXXXXXX). */

export function digitsOnly(raw: string): string {
  return (raw || "").replace(/[^\d]/g, "");
}

/** Returns E.164 or null when the input isn't a usable number. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const d = digitsOnly(trimmed);
    if (d.length < 8 || d.length > 15) return null;
    return `+${d}`;
  }

  const d = digitsOnly(trimmed);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

/** Pretty US display, falls back to the raw value. */
export function formatUsPhone(raw: string | null | undefined): string {
  const e164 = toE164(raw);
  if (!e164 || !e164.startsWith("+1") || e164.length !== 12) return raw ?? "";
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export const PHONE_HELP = "US numbers, e.g. (214) 555-0142. Include +country code for international.";
