import { allServices, type ServiceHit } from "@/lib/catalog";

/** Phrases users add that carry no service meaning. */
const FILLER_PHRASES = [
  "near me", "near by", "nearby", "in my area", "around me",
  "home service", "at home", "in home", "mobile service",
  "how much", "cost of", "price of", "book a", "book an", "book",
  "i need a", "i need an", "i need", "looking for a", "looking for",
  "find a", "find an", "find",
];

const STOP_WORDS = new Set([
  "a", "an", "the", "my", "of", "for", "to", "and", "or", "in", "at", "on", "with",
  "service", "services", "guy", "person", "pro", "help", "job", "quote", "cost", "price",
]);

/**
 * Broad discovery words. These identify a trade or theme, never one exact
 * sub-service, so they must stay on /search instead of auto-routing.
 */
const BROAD_TERMS = new Set([
  "beauty", "beautician", "salon", "spa", "hair", "nails", "nail", "grooming",
  "electrician", "electrical", "plumber", "plumbing", "hvac", "heating", "cooling", "ac",
  "cleaning", "cleaner", "clean", "handyman", "handy man", "lawn", "yard", "garden",
  "moving", "movers", "mover", "move", "painter", "painting", "repair", "repairs",
  "installation", "install", "maintenance", "home", "house", "appliance", "appliances",
  "furniture", "roofing", "roof", "pest", "locksmith", "pool", "auto", "car", "pet",
  "emergency", "junk", "flooring", "tile", "drywall", "garage", "organization", "errands",
]);

/** Curated aliases for high-value services: alias -> "categorySlug/serviceSlug". */
const ALIASES: Record<string, string> = {
  "hair removal": "beauty-at-home/waxing",
  "wax": "beauty-at-home/waxing",
  "makeup artist": "beauty-at-home/makeup-application",
  "mua": "beauty-at-home/makeup-application",
  "blow dry": "beauty-at-home/blowout",
  "blow out": "beauty-at-home/blowout",
  "lash": "beauty-at-home/lash-brow",
  "lashes": "beauty-at-home/lash-brow",
  "eyelash extensions": "beauty-at-home/lash-brow",
  "brow": "beauty-at-home/lash-brow",
  "brows": "beauty-at-home/lash-brow",
  "eyebrow": "beauty-at-home/lash-brow",
  "lash and brow": "beauty-at-home/lash-brow",
  "gel nails": "beauty-at-home/manicure",
  "barber": "beauty-at-home/mens-grooming",
  "facial": "beauty-at-home/facial-skincare",
  "massage": "beauty-at-home/massage-therapy",
  "mount tv": "mounting-installation/tv-mounting",
  "tv mount": "mounting-installation/tv-mounting",
  "hang tv": "mounting-installation/tv-mounting",
  "wall mount tv": "mounting-installation/tv-mounting",
  "fridge repair": "appliances/refrigerator-repair",
  "refrigerator repair": "appliances/refrigerator-repair",
  "couch repair": "furniture/sofa-repair",
  "sofa repair": "furniture/sofa-repair",
  "mow lawn": "lawn-outdoor/lawn-mowing",
  "grass cutting": "lawn-outdoor/lawn-mowing",
  "lawn mowing": "lawn-outdoor/lawn-mowing",
  "ceiling fan": "electrical/ceiling-fan-installation",
  "install ceiling fan": "electrical/ceiling-fan-installation",
  "pressure washing": "exterior-cleaning/pressure-washing",
};

export function normalizeQuery(raw: string): string {
  let q = raw.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
  for (const phrase of FILLER_PHRASES) {
    q = q.replace(new RegExp(`(^|\\s)${phrase}(\\s|$)`, "g"), " ");
  }
  return q.replace(/\s+/g, " ").trim();
}

function stem(word: string): string {
  if (word.length > 6 && word.endsWith("ation")) return word.slice(0, -5);
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function tokenize(raw: string): string[] {
  return normalizeQuery(raw)
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
}

type IndexEntry = { hit: ServiceHit; nameKey: string; slugKey: string; tokens: Set<string> };

let indexCache: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  if (indexCache) return indexCache;
  indexCache = allServices().map((hit) => {
    const nameKey = normalizeQuery(hit.service.name);
    const slugKey = normalizeQuery(hit.service.slug.replace(/-/g, " "));
    const tokens = new Set([
      ...tokenize(hit.service.name),
      ...tokenize(hit.service.slug.replace(/-/g, " ")),
      ...(hit.service.cues ?? []).flatMap((c) => tokenize(c)),
    ]);
    return { hit, nameKey, slugKey, tokens };
  });
  return indexCache;
}

function isBroad(q: string): boolean {
  if (BROAD_TERMS.has(q)) return true;
  const tokens = q.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => BROAD_TERMS.has(t));
}

/**
 * Returns a service only when the query unambiguously identifies exactly one
 * GPB sub-service. Broad trade/theme words never resolve.
 */
export function matchServiceIntent(raw: string): ServiceHit | null {
  const q = normalizeQuery(raw);
  if (!q) return null;

  const aliasTarget = ALIASES[q];
  if (aliasTarget) {
    const [cat, svc] = aliasTarget.split("/");
    const found = buildIndex().find((e) => e.hit.category.slug === cat && e.hit.service.slug === svc);
    if (found) return found.hit;
  }

  const index = buildIndex();

  // Exact service name or slug.
  const exact = index.filter((e) => e.nameKey === q || e.slugKey === q);
  if (exact.length === 1 && exact[0]) return exact[0].hit;

  if (isBroad(q)) return null;

  const qTokens = tokenize(q);
  if (qTokens.length === 0) return null;

  // Full token-set equality (handles "install ceiling fan" vs "ceiling fan installation").
  const setEqual = index.filter(
    (e) => qTokens.length === e.tokens.size && qTokens.every((t) => e.tokens.has(t)),
  );
  if (setEqual.length === 1 && setEqual[0]) return setEqual[0].hit;

  // Unique subset match: every query token appears in exactly one service.
  const subset = index.filter((e) => qTokens.every((t) => e.tokens.has(t)));
  if (subset.length === 1 && subset[0]) return subset[0].hit;

  return null;
}

/** Token-aware ranking used to surface suggestion chips for partial input. */
export function rankServices(raw: string, limit = 6): ServiceHit[] {
  const q = normalizeQuery(raw);
  if (!q) return [];
  const qTokens = tokenize(q);
  const scored = buildIndex()
    .map((e) => {
      let score = 99;
      if (e.nameKey === q || e.slugKey === q) score = 0;
      else if (e.nameKey.startsWith(q)) score = 1;
      else if (e.nameKey.includes(q)) score = 2;
      else if (qTokens.length && qTokens.every((t) => e.tokens.has(t))) score = 3;
      else if (qTokens.some((t) => e.tokens.has(t))) score = 4;
      return { hit: e.hit, score };
    })
    .filter((x) => x.score < 99);
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.hit);
}

const LOCATION_KEY = "gpb:last-location";

export function rememberLocation(loc: string) {
  if (typeof window === "undefined" || !loc.trim()) return;
  try { window.localStorage.setItem(LOCATION_KEY, loc.trim()); } catch { /* ignore */ }
}

export function recallLocation(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(LOCATION_KEY) ?? ""; } catch { return ""; }
}
