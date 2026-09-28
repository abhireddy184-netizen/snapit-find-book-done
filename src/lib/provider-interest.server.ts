// Server-only: provider interest persistence, confirmation email and the
// interest -> provider-account -> business-profile continuity link.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { notifyNewLead } from "@/lib/lead-notify.server";

const SITE_URL = "https://getperfectboy.com";

export type ProviderInterestInput = {
  fullName: string;
  email: string;
  phone: string | null;
  zip: string;
  city: string;
  state: string;
  categorySlug: string;
  categoryLabel: string;
  businessName: string | null;
  note: string | null;
};

export type ProviderInterestOutcome = {
  status: "registered" | "already_registered";
  emailDelivery: "sent" | "skipped" | "suppressed" | "failed";
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function registerInterest(
  input: ProviderInterestInput,
): Promise<ProviderInterestOutcome> {
  const emailNormalized = normalizeEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNormalized)) {
    throw new Error("Please enter a valid email address.");
  }

  // Idempotency: the same email + trade is one registration, not two.
  const { data: existing } = await supabaseAdmin
    .from("provider_interest")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .eq("category_slug", input.categorySlug)
    .maybeSingle();

  let rowId = existing?.id as string | undefined;
  let status: ProviderInterestOutcome["status"] = "already_registered";

  if (!rowId) {
    const { data, error } = await supabaseAdmin
      .from("provider_interest")
      .insert({
        full_name: input.fullName.slice(0, 120),
        email: input.email.trim().slice(0, 255),
        email_normalized: emailNormalized,
        phone: input.phone,
        zip: input.zip,
        city: input.city,
        state: input.state,
        category_slug: input.categorySlug,
        category_label: input.categoryLabel,
        business_name: input.businessName,
        note: input.note,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("We couldn’t submit that just now. Please try again.");
    rowId = data.id as string;
    status = "registered";
    await notifyNewLead({
      leadType: "provider",
      leadId: rowId,
      name: input.fullName,
      email: input.email.trim(),
      phone: input.phone,
      businessName: input.businessName,
      service: input.categoryLabel,
      city: input.city,
      state: input.state,
      zip: input.zip,
      note: input.note,
      source: "provider_interest",
    });
  }

  let emailDelivery: ProviderInterestOutcome["emailDelivery"] = "skipped";
  try {
    const result = await sendTemplateEmail("provider-interest", emailNormalized, {
      templateData: {
        fullName: input.fullName.split(" ")[0] || input.fullName,
        categoryLabel: input.categoryLabel,
        city: input.city,
        state: input.state,
        siteUrl: SITE_URL,
      },
      // Same registration = same key, so retries never send twice.
      idempotencyKey: `provider-interest-${rowId}`,
    });
    emailDelivery = result.sent ? "sent" : "suppressed";
  } catch (error) {
    console.error("[provider-interest] Confirmation email failed:", error);
    emailDelivery = "failed";
  }

  return { status, emailDelivery };
}

export type ClaimResult = {
  applied: boolean;
  fields: string[];
};

/**
 * Links a previously submitted provider-interest registration to the
 * signed-in provider account, by normalized email. Only fills fields the
 * provider has not already set — never overwrites their own edits.
 */
export async function claimInterestForUser(
  userId: string,
  email: string | undefined,
): Promise<ClaimResult> {
  const emailNormalized = email ? normalizeEmail(email) : "";
  if (!emailNormalized) return { applied: false, fields: [] };

  const { data: profile } = await supabaseAdmin
    .from("provider_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Already linked once — respect whatever the provider has since edited.
  if (profile?.interest_claimed_at) return { applied: false, fields: [] };

  const { data: interest } = await supabaseAdmin
    .from("provider_interest")
    .select("*")
    .eq("email_normalized", emailNormalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!interest) return { applied: false, fields: [] };

  const fields: string[] = [];
  const patch: Record<string, unknown> = {
    user_id: userId,
    interest_claimed_at: new Date().toISOString(),
  };
  const fill = (column: string, value: unknown, label: string) => {
    const current = profile ? (profile as Record<string, unknown>)[column] : null;
    if (value == null || value === "") return;
    if (current != null && current !== "") return;
    patch[column] = value;
    fields.push(label);
  };

  const serviceArea =
    interest.city && interest.state ? `${interest.city}, ${interest.state}` : null;

  fill("business_name", interest.business_name, "business name");
  fill("service_category", interest.category_label, "service category");
  fill("service_zip", interest.zip, "service ZIP");
  fill("service_area", serviceArea, "service area");
  fill("phone", interest.phone, "phone");
  fill("bio", interest.note, "about your business");

  // business_name is NOT NULL — fall back to their name when they gave none.
  if (!profile && patch['business_name'] == null) {
    patch['business_name'] = interest.business_name || interest.full_name;
  }

  const { error } = await supabaseAdmin
    .from("provider_profiles")
    .upsert(patch as never, { onConflict: "user_id" });
  if (error) {
    console.error("[provider-interest] Claim failed:", error);
    return { applied: false, fields: [] };
  }

  return { applied: fields.length > 0 || !profile, fields };
}
