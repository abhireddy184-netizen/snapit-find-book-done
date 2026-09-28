import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerProviderInterest = createServerFn({ method: "POST" })
  .inputValidator((input: {
    fullName: string;
    email: string;
    phone?: string | null;
    zip: string;
    city: string;
    state: string;
    categorySlug: string;
    categoryLabel: string;
    businessName?: string | null;
    note?: string | null;
    yearsExperience?: number | null;
    attribution?: Record<string, string | null | undefined> | null;
  }) => ({
    fullName: String(input?.fullName ?? "").trim().slice(0, 120),
    email: String(input?.email ?? "").trim().slice(0, 255),
    phone: cleanPhone(input?.phone),
    zip: String(input?.zip ?? "").trim().slice(0, 5),
    city: String(input?.city ?? "").slice(0, 120),
    state: String(input?.state ?? "").slice(0, 2),
    categorySlug: String(input?.categorySlug ?? "").slice(0, 80),
    categoryLabel: String(input?.categoryLabel ?? "").slice(0, 160),
    businessName: input?.businessName ? String(input.businessName).trim().slice(0, 160) : null,
    note: input?.note ? String(input.note).trim().slice(0, 500) : null,
    yearsExperience: cleanYears(input?.yearsExperience),
    attribution: cleanAttribution(input?.attribution),
  }))
  .handler(async ({ data }) => {
    const { registerInterest } = await import("./provider-interest.server");
    return registerInterest(data);
  });

/** Pulls any matching provider-interest registration into the provider's profile. */
export const claimProviderInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claimInterestForUser } = await import("./provider-interest.server");
    const email = (context.claims as { email?: string } | undefined)?.email;
    return claimInterestForUser(context.userId, email);
  });

const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

function cleanYears(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > 80) throw new Error("Years of experience must be between 0 and 80.");
  return n;
}

function cleanAttribution(v: unknown): Record<(typeof ATTR_KEYS)[number], string | null> {
  const src = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out = {} as Record<(typeof ATTR_KEYS)[number], string | null>;
  for (const k of ATTR_KEYS) {
    const raw = src[k];
    const val = typeof raw === "string" ? raw.trim().slice(0, 255) : "";
    out[k] = val || null;
  }
  return out;
}

function cleanPhone(v: unknown): string {
  const phone = String(v ?? "").trim().slice(0, 40);
  if (phone.replace(/\D/g, "").length < 10) throw new Error("Please enter a valid phone number.");
  return phone;
}
