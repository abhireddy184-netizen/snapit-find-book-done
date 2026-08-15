/**
 * Offline US ZIP lookup + distance helpers.
 *
 * The dataset (src/lib/us-zips.data.ts) is public-domain USPS ZIP centroid data.
 * It is large, so it is loaded lazily on first lookup and cached in memory.
 * No API key and no network call is required.
 */

export type ZipPlace = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
};

let indexPromise: Promise<Map<string, ZipPlace>> | null = null;
let cached: Map<string, ZipPlace> | null = null;

async function buildIndex(): Promise<Map<string, ZipPlace>> {
  const { US_ZIP_DATA } = await import("./us-zips.data");
  const map = new Map<string, ZipPlace>();
  for (const line of US_ZIP_DATA.split("\n")) {
    const parts = line.split("|");
    if (parts.length !== 5) continue;
    const [zip, city, state, lat, lng] = parts as [string, string, string, string, string];
    map.set(zip, { zip, city, state, lat: Number(lat), lng: Number(lng) });
  }
  cached = map;
  return map;
}

export function loadZipIndex(): Promise<Map<string, ZipPlace>> {
  if (cached) return Promise.resolve(cached);
  indexPromise ??= buildIndex();
  return indexPromise;
}

/** True when the input looks like a 5-digit US ZIP code. */
export function isZipCode(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

/** Pull a 5-digit ZIP out of free text such as "Frisco, TX 75034". */
export function extractZip(value: string): string | null {
  const match = value.trim().match(/\b(\d{5})\b/);
  return match ? match[1]! : null;
}

/** Synchronous lookup — only returns a result once the index has been loaded. */
export function lookupZipSync(zip: string): ZipPlace | null {
  if (!cached) return null;
  return cached.get(zip.trim()) ?? null;
}

export async function lookupZip(zip: string): Promise<ZipPlace | null> {
  if (!isZipCode(zip)) return null;
  const index = await loadZipIndex();
  return index.get(zip.trim()) ?? null;
}

export function formatPlace(place: ZipPlace): string {
  return `${place.city}, ${place.state} ${place.zip}`;
}

export function formatPlaceShort(place: ZipPlace): string {
  return `${place.city}, ${place.state}`;
}

/* ------------------------------------------------------------------ *
 * Suggestions (offline autocomplete)
 * ------------------------------------------------------------------ */

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC","PR","VI","GU","AS","MP",
]);

/**
 * Offline autocomplete over the ZIP dataset.
 * Supports ZIP prefixes ("774"), full ZIPs, city names ("frisco") and
 * city + state ("katy tx").
 */
export async function searchPlaces(raw: string, limit = 5): Promise<ZipPlace[]> {
  const query = raw.trim().toLowerCase();
  if (query.length < 2) return [];
  const index = await loadZipIndex();
  const all = Array.from(index.values());

  // Digits → ZIP prefix search
  const digits = query.replace(/[^0-9]/g, "");
  if (digits && /^[0-9\s-]+$/.test(query)) {
    if (digits.length < 3) return [];
    const exact = index.get(digits.padStart(5, "0"));
    const out: ZipPlace[] = [];
    if (digits.length === 5 && exact) out.push(exact);
    for (const p of all) {
      if (out.length >= limit) break;
      if (p.zip.startsWith(digits) && !out.some((o) => o.zip === p.zip)) out.push(p);
    }
    return out.slice(0, limit);
  }

  // Text → city (+ optional state) search
  const cleaned = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  let state: string | null = null;
  const last = tokens[tokens.length - 1]?.toUpperCase();
  if (tokens.length > 1 && last && US_STATES.has(last)) {
    state = last;
    tokens.pop();
  }
  const cityQuery = tokens.join(" ");
  if (!cityQuery) return [];

  const starts: ZipPlace[] = [];
  const contains: ZipPlace[] = [];
  const seen = new Set<string>();
  for (const p of all) {
    if (state && p.state !== state) continue;
    const city = p.city.toLowerCase();
    const key = `${city}|${p.state}`;
    if (seen.has(key)) continue;
    if (city.startsWith(cityQuery)) {
      seen.add(key);
      starts.push(p);
    } else if (city.includes(cityQuery)) {
      contains.push(p);
    }
    if (starts.length >= limit) break;
  }
  const merged = [...starts];
  for (const p of contains) {
    if (merged.length >= limit) break;
    const key = `${p.city.toLowerCase()}|${p.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }
  return merged.slice(0, limit);
}

const EARTH_RADIUS_MILES = 3958.7613;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng pairs, in miles. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type ResolvedLocation =
  | { kind: "empty" }
  | { kind: "loading"; raw: string }
  | { kind: "zip"; raw: string; place: ZipPlace; label: string }
  | { kind: "invalid-zip"; raw: string; message: string }
  /** Free text we could not geocode offline — accepted, but with no coordinates. */
  | { kind: "text"; raw: string; label: string };

/**
 * Resolve a raw location string. Accepts a 5-digit ZIP, "City, ST 12345",
 * or plain city/state text (kept as-is, without inventing coordinates).
 */
export async function resolveLocation(raw: string): Promise<ResolvedLocation> {
  const value = raw.trim();
  if (!value) return { kind: "empty" };

  const embeddedZip = extractZip(value);
  if (embeddedZip) {
    const place = await lookupZip(embeddedZip);
    if (place) return { kind: "zip", raw: value, place, label: formatPlace(place) };
    if (isZipCode(value)) {
      return {
        kind: "invalid-zip",
        raw: value,
        message: `${value} isn’t a recognized US ZIP code. Check the 5 digits or enter a city and state.`,
      };
    }
  }

  return { kind: "text", raw: value, label: value };
}

/* ------------------------------------------------------------------ *
 * React helper
 * ------------------------------------------------------------------ */
import { useEffect, useState } from "react";

/** Debounced offline resolution of a location input. */
export function useResolvedLocation(raw: string, debounceMs = 250): ResolvedLocation {
  const [resolved, setResolved] = useState<ResolvedLocation>(() =>
    raw.trim() ? { kind: "loading", raw: raw.trim() } : { kind: "empty" },
  );

  useEffect(() => {
    const value = raw.trim();
    if (!value) {
      setResolved({ kind: "empty" });
      return;
    }
    let active = true;
    setResolved({ kind: "loading", raw: value });
    const timer = setTimeout(() => {
      void resolveLocation(value).then((next) => {
        if (active) setResolved(next);
      });
    }, debounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [raw, debounceMs]);

  return resolved;
}
