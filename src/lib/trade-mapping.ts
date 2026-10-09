import { catalog, getCategoryBySlug } from "@/lib/catalog";

/**
 * Common trade words customers actually type/search ("plumber", "electrician")
 * mapped to the GetPros catalog category they belong to. Used to build honest
 * headlines like "Plumbers near Frisco" instead of naming one narrow sub-service
 * such as "Drain Clearing pros".
 */
export const TRADE_WORD_TO_CATEGORY: Record<string, string> = {
  plumber: "plumbing",
  plumbers: "plumbing",
  plumbing: "plumbing",
  electrician: "electrical",
  electricians: "electrical",
  electrical: "electrical",
  hvac: "hvac",
  "heating and cooling": "hvac",
  "heating & cooling": "hvac",
  cleaner: "cleaning",
  cleaners: "cleaning",
  "house cleaner": "cleaning",
  "house cleaners": "cleaning",
  "house cleaning": "cleaning",
  handyman: "handyman",
  handymen: "handyman",
  "handy man": "handyman",
  roofer: "roofing-exterior",
  roofers: "roofing-exterior",
  roofing: "roofing-exterior",
};

/** Singular, human-readable trade name for a catalog category slug. */
const TRADE_LABELS: Record<string, string> = {
  plumbing: "Plumber",
  electrical: "Electrician",
  hvac: "Heating & Cooling pro",
  cleaning: "Home Cleaner",
  handyman: "Handyman",
  "roofing-exterior": "Roofer",
};

export type TradeMatch = { categorySlug: string; tradeLabel: string; tradeLabelPlural: string };

function pluralize(label: string): string {
  if (label.endsWith("y") && !/[aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
  return `${label}s`;
}

/** Resolve a free-text trade word/phrase to its GetPros category, if any. */
export function matchTradeWord(raw: string): TradeMatch | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;
  const slug = TRADE_WORD_TO_CATEGORY[q];
  if (!slug) return null;
  const label = TRADE_LABELS[slug] ?? (getCategoryBySlug(slug)?.name ?? "Pro");
  return { categorySlug: slug, tradeLabel: label, tradeLabelPlural: pluralize(label) };
}

/** Headline such as "Plumbers near Frisco, TX" — never a single narrow sub-service name. */
export function tradeHeadline(raw: string, placeLabel: string): string | null {
  const match = matchTradeWord(raw);
  if (!match) return null;
  return placeLabel ? `${match.tradeLabelPlural} near ${placeLabel}` : `${match.tradeLabelPlural} near you`;
}

/** Top services (by `featured`, falling back to the first ones) for a category slug. */
export function topServicesForTrade(categorySlug: string, limit = 4) {
  const category = catalog.find((c) => c.slug === categorySlug);
  if (!category) return [];
  const featured = category.services.filter((s) => s.featured);
  const rest = category.services.filter((s) => !s.featured);
  return [...featured, ...rest].slice(0, limit);
}
