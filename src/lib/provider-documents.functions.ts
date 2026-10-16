import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only, explicit action: email one pro a link to upload documents in their dashboard.
 * At most one request per pro per UTC day (ledger provider_document_requests), so double
 * clicks never send twice. No files are ever attached to email.
 */
export const adminRequestProviderDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), confirm: z.literal(true) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) return { ok: false, message: "Only admins can request documents." };

    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [{ data: pp }, { data: u }] = await Promise.all([
      db.from("provider_profiles").select("business_name").eq("user_id", data.userId).maybeSingle(),
      db.auth.admin.getUserById(data.userId),
    ]);
    const email = u?.user?.email;
    if (!pp || !email || !u?.user?.email_confirmed_at) return { ok: false, message: "This pro has no confirmed email or profile." };

    const { data: row, error } = await db.from("provider_document_requests")
      .insert({ user_id: data.userId, requested_by: context.userId }).select("id").single();
    if (error) {
      if ((error as { code?: string }).code === "23505")
        return { ok: false, message: "A document request was already sent to this pro today." };
      return { ok: false, message: "Could not record the request." };
    }
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const { SITE_URL } = await import("@/lib/brand");
      const r = await sendTemplateEmail("provider-documents-request", email, {
        templateData: { businessName: pp.business_name, siteUrl: SITE_URL },
        idempotencyKey: `provider-docs-request-${row.id}`,
      });
      await db.from("provider_document_requests")
        .update({ status: r.sent ? "sent" : "suppressed", attempts: 1, sent_at: new Date().toISOString() }).eq("id", row.id);
      return r.sent
        ? { ok: true, message: "Document request sent." }
        : { ok: false, message: "This email address is blocked from GetPros emails, so nothing was sent." };
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      await db.from("provider_document_requests").update({ status: "failed", attempts: 1, last_error: msg }).eq("id", row.id);
      return { ok: false, message: "The email could not be sent. Please try again tomorrow or contact the pro directly." };
    }
  });

/** Called by the pro's Documents tab after an upload; sends the one-time receipt once the required set is in. */
export const notifyMyDocumentsUploaded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyDocumentsReceived } = await import("@/lib/provider-onboarding.server");
    await notifyDocumentsReceived(supabaseAdmin, context.userId);
    return { ok: true };
  });
