// Server-only: customer early-access persistence + internal notification.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyNewLead } from "@/lib/lead-notify.server";

const SOURCE = "homepage_early_access";

export async function saveEarlyAccess(input: {
  fullName: string;
  email: string;
  location: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  serviceInterest: string;
}): Promise<{ ok: true }> {
  const normalized = input.email.toLowerCase();
  if (input.fullName.length < 2) throw new Error("Please enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error("Please enter a valid email address.");
  if (input.location.length < 2) throw new Error("Please enter your city or ZIP code.");
  if (!input.serviceInterest) throw new Error("Please choose the service you're interested in.");

  // Same email + service already on the list → still stored as before, but not a new lead.
  const { data: prior } = await supabaseAdmin
    .from("early_access")
    .select("id")
    .eq("email_normalized", normalized)
    .eq("service_interest", input.serviceInterest)
    .limit(1);
  const isNew = !prior || prior.length === 0;

  const { data, error } = await supabaseAdmin
    .from("early_access")
    .insert({
      full_name: input.fullName,
      email: input.email,
      email_normalized: normalized,
      location: input.location,
      city: input.city,
      state: input.state,
      zip: input.zip,
      service_interest: input.serviceInterest,
      source: SOURCE,
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    console.error("[early-access] Insert failed:", error);
    throw new Error("We couldn’t submit that just now. Please try again in a moment.");
  }

  if (isNew) {
    await notifyNewLead({
      leadType: "early_access",
      leadId: data.id as string,
      name: input.fullName,
      email: input.email,
      service: input.serviceInterest,
      city: input.city,
      state: input.state,
      zip: input.zip,
      location: input.location,
      source: SOURCE,
      submittedAt: data.created_at as string,
    });
  }
  return { ok: true };
}
