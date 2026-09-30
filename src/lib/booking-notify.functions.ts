import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Owner alert for a new booking request. The booking is saved first (by the
 * booking page); this reads it back as the signed-in customer (RLS) and emails
 * info@getpros.ai. One alert per booking; failures never affect the booking.
 */
export const notifyNewBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestKey: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { data: b } = await context.supabase
        .from("bookings")
        .select("id, service, details, service_address, service_zip, scheduled_date, scheduled_time, provider_name_snapshot, created_at")
        .eq("customer_id", context.userId)
        .eq("idempotency_key", data.requestKey)
        .maybeSingle();
      if (!b) return { ok: false };
      const email = (context.claims as { email?: string } | undefined)?.email ?? null;
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", context.userId)
        .maybeSingle();
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("internal-lead", "", {
        templateData: {
          leadType: "booking",
          name: (profile as { full_name?: string } | null)?.full_name ?? null,
          email,
          service: b.service,
          businessName: b.provider_name_snapshot,
          location: b.service_address,
          zip: b.service_zip,
          note: [`${b.scheduled_date} ${b.scheduled_time}`, b.details].filter(Boolean).join(" — "),
          source: "booking request (/book)",
          submittedAt: b.created_at,
        },
        idempotencyKey: `internal-booking-${b.id}`,
        replyTo: email || undefined,
      });
      return { ok: true };
    } catch (err) {
      console.error("[booking-notify] Owner notification failed:", err);
      return { ok: false };
    }
  });
