import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  business_name: z.string().trim().min(1).max(200),
  service_category: z.string().max(200).nullable(),
  service_area: z.string().max(300).nullable(),
  service_zip: z.string().regex(/^\d{5}$/).nullable(),
  service_radius_miles: z.number().min(1).max(200).nullable(),
  starting_price: z.number().min(0).max(1_000_000).nullable(),
  availability: z.string().max(500).nullable(),
  phone: z.string().max(40).nullable(),
  bio: z.string().max(4000).nullable(),
});

/** Saves the signed-in pro's own business profile (phone is not client-writable). */
export const saveProviderProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }): Promise<{ error: string | null }> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("is_provider, role")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile || !(profile.is_provider || profile.role === "provider")) {
      return { error: "Only service providers can save a business profile." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("provider_profiles")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) {
      console.error("[provider-profile] save failed:", error.message);
      return { error: "We couldn't save your business profile. Please try again." };
    }
    // One owner alert, only once the required fields are complete (stable key dedupes later edits).
    try {
      const { notifyProfileCompleted } = await import("@/lib/provider-onboarding.server");
      await notifyProfileCompleted(context.userId, data);
      const { sendProfileSubmittedConfirmation } = await import("@/lib/provider-onboarding.server");
      await sendProfileSubmittedConfirmation(supabaseAdmin, context.userId, data);
      const { queueDocumentsRequest } = await import("@/lib/provider-onboarding.server");
      await queueDocumentsRequest(supabaseAdmin, context.userId, data);
    } catch (err) {
      console.error("[provider-profile] completion alert failed:", err instanceof Error ? err.message : err);
    }
    return { error: null };
  });

/** Sends the one-time "complete your profile" email to a verified pro with an incomplete profile. */
export const ensureProviderOnboardingEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureProviderWelcome } = await import("@/lib/provider-onboarding.server");
    await ensureProviderWelcome(supabaseAdmin, context.userId);
    return { ok: true };
  });
