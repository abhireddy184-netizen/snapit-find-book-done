// Server-only: subscription persistence + welcome email delivery.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SubscribeOutcome = {
  status: "subscribed" | "already_subscribed" | "resubscribed";
  emailDelivery: "sent" | "unconfigured" | "failed";
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

const SITE_URL = "https://getperfectboy.com";

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
    status === "already_subscribed" ? "unconfigured" : await sendWelcomeEmail(email, token);

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

async function sendWelcomeEmail(email: string, token: string): Promise<"sent" | "unconfigured" | "failed"> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["GPB_FROM_EMAIL"] || "GPB <info@getperfectboy.com>";
  if (!apiKey) {
    console.warn("[subscribe] Welcome email pending: RESEND_API_KEY is not configured.");
    return "unconfigured";
  }

  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${token}`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: "info@getperfectboy.com",
        subject: "Welcome to GPB 👋",
        html: welcomeHtml(unsubscribeUrl),
      }),
    });
    if (!res.ok) {
      console.error(`[subscribe] Welcome email failed with status ${res.status}`);
      return "failed";
    }
    return "sent";
  } catch {
    console.error("[subscribe] Welcome email request threw.");
    return "failed";
  }
}

function welcomeHtml(unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#2b1030">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="font-size:28px;font-weight:800;letter-spacing:-.02em">GPB</div>
    <div style="font-size:13px;font-weight:700;color:#6b5b6e;margin-top:2px">GetPerfectBoy.com</div>
    <h1 style="font-size:22px;margin:24px 0 8px">Show it. We'll handle the rest.</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a3550">
      Thanks for joining GPB. We'll keep you updated on launches, new services and important GPB updates.
    </p>
    <p style="margin-top:28px">
      <a href="${SITE_URL}" style="display:inline-block;background:#e6187f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px">Explore GPB</a>
    </p>
    <hr style="border:none;border-top:1px solid #ece5ef;margin:32px 0 16px" />
    <p style="font-size:12px;color:#8a7c8e">
      You're receiving this because you subscribed on GetPerfectBoy.com.
      <a href="${unsubscribeUrl}" style="color:#8a7c8e">Unsubscribe</a>.
    </p>
  </div></body></html>`;
}
