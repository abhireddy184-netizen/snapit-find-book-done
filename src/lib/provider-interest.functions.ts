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
  }) => ({
    fullName: String(input?.fullName ?? "").trim().slice(0, 120),
    email: String(input?.email ?? "").trim().slice(0, 255),
    phone: input?.phone ? String(input.phone).trim().slice(0, 40) : null,
    zip: String(input?.zip ?? "").trim().slice(0, 5),
    city: String(input?.city ?? "").slice(0, 120),
    state: String(input?.state ?? "").slice(0, 2),
    categorySlug: String(input?.categorySlug ?? "").slice(0, 80),
    categoryLabel: String(input?.categoryLabel ?? "").slice(0, 160),
    businessName: input?.businessName ? String(input.businessName).trim().slice(0, 160) : null,
    note: input?.note ? String(input.note).trim().slice(0, 1000) : null,
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
