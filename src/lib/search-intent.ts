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
  "waxing": "beauty-at-home/waxing",
  "body wax": "beauty-at-home/waxing",
  "full body wax": "beauty-at-home/waxing",
  "full-body wax": "beauty-at-home/waxing",
  "full body waxing": "beauty-at-home/waxing",
  "full body hair removal": "beauty-at-home/waxing",
  "waxing service": "beauty-at-home/waxing",
  "bikini wax": "beauty-at-home/waxing",
  "leg wax": "beauty-at-home/waxing",
  "brazilian wax": "beauty-at-home/waxing",
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
  "tv mounting": "mounting-installation/tv-mounting",
  "mount my tv": "mounting-installation/tv-mounting",
  "hang tv": "mounting-installation/tv-mounting",
  "hang my tv": "mounting-installation/tv-mounting",
  "wall mount tv": "mounting-installation/tv-mounting",
  "tv wall mounting": "mounting-installation/tv-mounting",
  "tv installation": "mounting-installation/tv-mounting",
  "tv repair": "appliances/tv-repair",
  "television repair": "appliances/tv-repair",
  "repair tv": "appliances/tv-repair",
  "fix tv": "appliances/tv-repair",
  "fix my tv": "appliances/tv-repair",
  "tv not working": "appliances/tv-repair",
  "tv no picture": "appliances/tv-repair",
  "tv screen broken": "appliances/tv-repair",
  "cracked tv screen": "appliances/tv-repair",
  "tv wont turn on": "appliances/tv-repair",
  "tv setup": "appliances/tv-setup",
  "tv troubleshooting": "appliances/tv-setup",
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

  /* Plumbing */
  "drain cleaning": "plumbing/drain-clearing",
  "drain clearing": "plumbing/drain-clearing",
  "clogged drain": "plumbing/drain-clearing",
  "blocked drain": "plumbing/drain-clearing",
  "clogged sink": "plumbing/drain-clearing",
  "slow drain": "plumbing/drain-clearing",
  "unclog drain": "plumbing/drain-clearing",
  "snake drain": "plumbing/drain-clearing",
  "clogged toilet": "plumbing/toilet-repair",
  "running toilet": "plumbing/toilet-repair",
  "toilet leak": "plumbing/toilet-repair",
  "leaky faucet": "plumbing/faucet-replacement",
  "dripping faucet": "plumbing/faucet-replacement",
  "tap leaking": "plumbing/faucet-replacement",
  "faucet leak": "plumbing/faucet-replacement",
  "no hot water": "plumbing/water-heater-service",
  "hot water heater": "plumbing/water-heater-service",
  "water heater": "plumbing/water-heater-service",
  "garbage disposal": "plumbing/garbage-disposal-repair",
  "burst pipe": "plumbing/pipe-repair",
  "water leak": "plumbing/leak-detection",

  /* Electrical */
  "light installation": "electrical/light-fixture-installation",
  "install light": "electrical/light-fixture-installation",
  "install lights": "electrical/light-fixture-installation",
  "light fitting": "electrical/light-fixture-installation",
  "chandelier": "electrical/light-fixture-installation",
  "pendant light": "electrical/light-fixture-installation",
  "dead outlet": "electrical/outlet-switch-repair",
  "outlet not working": "electrical/outlet-switch-repair",
  "power outlet": "electrical/outlet-switch-repair",
  "light switch": "electrical/outlet-switch-repair",
  "breaker tripping": "electrical/outlet-switch-repair",
  "ev charger": "electrical/ev-charger-installation",
  "recessed lighting": "electrical/recessed-lighting",

  /* Handyman */
  "handyman": "handyman/handyman-hour",
  "handy man": "handyman/handyman-hour",
  "handywoman": "handyman/handyman-hour",
  "odd jobs": "handyman/small-repairs",
  "small repairs": "handyman/small-repairs",
  "punch list": "handyman/handyman-hour",
  "door repair": "handyman/door-alignment",
  "sticking door": "handyman/door-alignment",
  "cabinet repair": "handyman/cabinet-repair",
  "caulking": "handyman/caulking",
  "recaulk": "handyman/caulking",

  /* HVAC */
  "ac repair": "hvac/ac-repair",
  "air conditioning repair": "hvac/ac-repair",
  "aircon": "hvac/ac-repair",
  "ac not cooling": "hvac/ac-repair",
  "ac tune up": "hvac/ac-tune-up",
  "furnace repair": "hvac/furnace-repair",
  "no heat": "hvac/furnace-repair",
  "thermostat": "hvac/thermostat-installation",

  /* Appliances */
  "washing machine repair": "appliances/washer-repair",
  "washer repair": "appliances/washer-repair",
  "dryer repair": "appliances/dryer-repair",
  "dishwasher repair": "appliances/dishwasher-service",
  "oven repair": "appliances/oven-range-repair",
  "stove repair": "appliances/oven-range-repair",
  "appliance installation": "appliances/appliance-installation",

  /* Cleaning */
  "deep cleaning": "cleaning/deep-cleaning",
  "deep clean": "cleaning/deep-cleaning",
  "move out cleaning": "cleaning/move-in-out-cleaning",
  "move in cleaning": "cleaning/move-in-out-cleaning",
  "carpet cleaning": "carpet-upholstery-cleaning/carpet-cleaning",
  "sofa cleaning": "carpet-upholstery-cleaning/upholstery-cleaning",
  "couch cleaning": "carpet-upholstery-cleaning/upholstery-cleaning",

  /* Mounting */
  "shelf installation": "mounting-installation/shelf-installation",
  "hang shelves": "mounting-installation/shelf-installation",
  "hang mirror": "mounting-installation/mirror-hanging",
};

/**
 * Queries that legitimately cover several sub-services. These must NOT resolve
 * to a single service (that traps the user on one page) — instead they promote
 * their members to the top of the ranked results.
 */
const ALIAS_GROUPS: Record<string, string[]> = {
  "house cleaning": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
  "home cleaning": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
  "cleaning": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
  "house cleaner": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
  "cleaner": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
  "maid": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/recurring-cleaning"],
  "apartment cleaning": ["cleaning/standard-cleaning", "cleaning/deep-cleaning", "cleaning/move-in-out-cleaning"],
};

function groupFor(q: string): string[] | null {
  return ALIAS_GROUPS[q] ?? null;
}


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

  if (groupFor(q)) return null;

  const aliasTarget = ALIASES[q] ?? ALIASES[q.replace(/\bwaxing\b/g, "wax")];
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
  const aliasHit = matchServiceIntent(raw);
  const group = groupFor(q) ?? [];
  const scored = buildIndex()
    .map((e) => {
      let score = 99;
      const groupRank = group.indexOf(`${e.hit.category.slug}/${e.hit.service.slug}`);
      if (groupRank >= 0) score = -10 + groupRank;
      else if (aliasHit && e.hit.service.slug === aliasHit.service.slug && e.hit.category.slug === aliasHit.category.slug) score = -1;
      else if (e.nameKey === q || e.slugKey === q) score = 0;
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

/**
 * True when a value the user put in a location field is really a GPB service
 * phrase ("Full body wax", "Pedicure", "Plumber"). Such values must never be
 * stored or used as a location.
 */
export function isServicePhrase(value: string): boolean {
  const q = normalizeQuery(value);
  if (!q) return false;
  // A real location almost always contains digits (ZIP) or a comma (City, ST).
  if (/\d/.test(value) || value.includes(",")) return false;
  if (ALIASES[q] || groupFor(q)) return true;
  if (isBroad(q)) return true;
  return matchServiceIntent(q) !== null;
}

/** Location memory, guarded so a service phrase can never become a location. */
export function rememberLocation(loc: string) {
  if (typeof window === "undefined") return;
  const value = loc.trim();
  if (!value) return;
  if (isServicePhrase(value)) {
    try { window.localStorage.removeItem(LOCATION_KEY); } catch { /* ignore */ }
    return;
  }
  try { window.localStorage.setItem(LOCATION_KEY, value); } catch { /* ignore */ }
}

export function recallLocation(): string {
  if (typeof window === "undefined") return "";
  try {
    const value = window.localStorage.getItem(LOCATION_KEY) ?? "";
    if (value && isServicePhrase(value)) {
      window.localStorage.removeItem(LOCATION_KEY);
      return "";
    }
    return value;
  } catch { return ""; }
}

/**
 * Scans free-form customer text (a photo note, a clarification answer, a voice
 * transcript) for an unambiguous service phrase anywhere inside it. Unlike
 * matchServiceIntent this does not require the whole string to be the service,
 * so "actually it's a TV repair, the screen is black" resolves. Longest phrase
 * wins so "tv repair" beats a shorter overlapping alias.
 */
export function detectServiceIntentInText(raw: string): ServiceHit | null {
  const q = normalizeQuery(raw);
  if (!q) return null;
  const direct = matchServiceIntent(q);
  if (direct) return direct;

  const padded = ` ${q} `;
  const phrases = Object.keys(ALIASES)
    .filter((phrase) => padded.includes(` ${phrase} `))
    .sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const target = ALIASES[phrase];
    if (!target) continue;
    const [cat, svc] = target.split("/");
    const found = buildIndex().find(
      (e) => e.hit.category.slug === cat && e.hit.service.slug === svc,
    );
    if (found) return found.hit;
  }

  // Fall back to an exact service-name mention ("Cushion & Foam Replacement").
  const named = buildIndex().filter((e) => e.nameKey.length > 6 && padded.includes(` ${e.nameKey} `));
  if (named.length === 1 && named[0]) return named[0].hit;
  return null;
}
