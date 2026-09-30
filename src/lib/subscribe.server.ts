// Server-only: subscription persistence + welcome email delivery.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { notifyNewLead } from "@/lib/lead-notify.server";

export type SubscribeOutcome = {
  status: "subscribed" | "already_subscribed" | "resubscribed";
  emailDelivery: "sent" | "skipped" | "suppressed" | "failed";
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

const SITE_URL = "https://getpros.ai";

export async function subscribeEmail(rawEmail: string, source: string): Promise<SubscribeOutcome> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");

  const { data: existing, error: readError } = await supabaseAdmin
    .from("subscribers")
    .select("id, status, unsubscribe_token")
    .eq("email_normalized", email)
    .maybeSingle();
  if (readError) throw new Error("We couldn't save your subscription. Please try again.");

  let status: SubscribeOutcome["status"] = "subscribed";
  let token: string;

  if (existing) {
    token = existing.unsubscribe_token as string;
    if (existing.status === "active") {
      status = "already_subscribed";
    } else {
      status = "resubscribed";
      const { error } = await supabaseAdmin
        .from("subscribers")
        .update({ status: "active", consent_at: new Date().toISOString(), source })
        .eq("id", existing.id);
      if (error) throw new Error("We couldn't save your subscription. Please try again.");
    }
  } else {
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .insert({ email, email_normalized: email, source })
      .select("unsubscribe_token")
      .single();
    if (error || !data) throw new Error("We couldn't save your subscription. Please try again.");
    token = data.unsubscribe_token as string;
  }

  const emailDelivery =
    status === "already_subscribed" ? "skipped" : await sendWelcomeEmail(email, existing?.id ?? email);

  if (status !== "already_subscribed") {
    await notifyNewLead({
      leadType: "subscriber",
      leadId: (existing?.id as string | undefined) ?? token,
      email,
      source,
      reactivated: status === "resubscribed",
    });
  }

  return { status, emailDelivery };
}

export async function unsubscribeByToken(token: string): Promise<"unsubscribed" | "not_found"> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return "not_found";
  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token)
    .select("id");
  if (error) throw new Error("We couldn't update your preferences. Please try again.");
  return data && data.length > 0 ? "unsubscribed" : "not_found";
}

async function sendWelcomeEmail(
  email: string,
  subscriberId: string,
): Promise<"sent" | "suppressed" | "failed"> {
  try {
    const result = await sendTemplateEmail("welcome", email, {
      templateData: { siteUrl: SITE_URL },
      idempotencyKey: `welcome-${subscriberId}`,
    });
    return result.sent ? "sent" : "suppressed";
  } catch (error) {
    console.error("[subscribe] Welcome email failed:", error);
    return "failed";
  }
}
