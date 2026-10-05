/**
 * Single source of truth for GetPros brand identity. Client-safe (no secrets).
 * Change values here only — pages, emails and server code import from this file.
 */
export const SITE_NAME = "GetPros.ai";
/** Short name used as the email sender display name. */
export const SENDER_NAME = "GetPros";
export const SITE_URL = "https://getpros.ai";
/** Public/customer contact mailbox and owner notification inbox. */
export const CONTACT_EMAIL = "info@getpros.ai";
/** Verified-sender subdomain delegated to the email service. */
export const EMAIL_SENDER_DOMAIN = "notify.getpros.ai";
/** Visible From domain. Root (getpros.ai) requires "display from root" on the email domain. */
export const EMAIL_FROM_DOMAIN = "notify.getpros.ai";
export const EMAIL_FROM_LOCAL = "noreply";

/** Wordmark colors: "Get" navy · "Pros" teal · ".ai" slate. */
export const BRAND_COLORS = {
  navy: "#0f2b4c",
  teal: "#0fa3b1",
  slate: "#64748b",
  ink: "#0f2b4c",
  body: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  surface: "#f1f8f9",
} as const;

export const siteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Organization JSON-LD script entry for route head() `scripts`. */
export const ORGANIZATION_JSONLD = {
  type: "application/ld+json",
  children: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GetPros",
    alternateName: "GetPros.ai",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/og-getpros.jpg`,
    description: "AI home-services marketplace — show, say, or type what you need and get matched with verified local professionals.",
    email: CONTACT_EMAIL,
  }),
};
