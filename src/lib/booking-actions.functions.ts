import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUS = z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]);
const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/**
 * The only way a booking's status changes. Clients have no UPDATE access on
 * bookings; this checks the caller is the assigned pro (confirm/decline/start/
 * complete) or the customer (cancel) before writing with the service role.
 */
export const changeBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        from: STATUS,
        to: STATUS,
        declineReason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!NEXT[data.from]?.includes(data.to)) {
      return { ok: false, message: `A ${data.from.replace("_", " ")} job can't be moved to ${data.to.replace("_", " ")}.` };
    }
    // Read as the caller (RLS) — they must be able to see the booking.
    const { data: b } = await context.supabase
      .from("bookings")
      .select("id, customer_id, provider_id, status, start_at, payment_method_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!b) return { ok: false, message: "We couldn't find that booking." };

    const isPro = b.provider_id === context.userId;
    const isCustomer = b.customer_id === context.userId;
    if (data.to === "cancelled" ? !(isPro || isCustomer) : !isPro) {
      return { ok: false, message: "You don't have permission to change this booking." };
    }
    if (data.declineReason && !isPro) {
      return { ok: false, message: "Only the assigned pro can add a decline reason." };
    }
    if (data.to === "confirmed" && !b.payment_method_id) {
      return { ok: false, message: "The customer hasn't added a card yet. You can accept once they do." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pay = await import("./payments.server");
    const startMs = b.start_at ? new Date(b.start_at).getTime() : null;
    const patch: Record<string, unknown> = { status: data.to };
    if (data.declineReason) patch["decline_reason"] = data.declineReason;
    if (data.to === "confirmed" && startMs) {
      patch["hold_scheduled_at"] = new Date(Math.max(Date.now(), startMs - pay.HOLD_LEAD_MS)).toISOString();
    }
    if (data.to === "completed") {
      patch["auto_capture_at"] = new Date(Date.now() + pay.AUTO_CAPTURE_MS).toISOString();
    }
    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .update(patch as never)
      .eq("id", data.id)
      .eq("status", data.from)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[booking-actions] transition failed:", error.message);
      return { ok: false, message: error.message };
    }
    if (!row) return { ok: false, message: "This job was already updated somewhere else. Refresh to see the latest status." };

    // Money follows the status change. Failures are recorded on the booking, never block the transition.
    if (data.to === "confirmed") {
      await pay.processDuePayments(supabaseAdmin, { userId: context.userId }).catch(() => {});
    } else if (data.to === "cancelled") {
      const late =
        isCustomer && data.from === "confirmed" && startMs != null && startMs - Date.now() < pay.LATE_CANCEL_MS;
      await pay.settleCancellation(supabaseAdmin, data.id, late);
    }
    return { ok: true };
  });

/**
 * Demo/foundation only: sample quotes so the comparison view can be tried
 * before real pros are onboarded. Prices are computed here, never sent by the
 * client, and every row is flagged is_demo with no provider.
 */
export const createDemoQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
        pros: z
          .array(z.object({ name: z.string().max(120), availability: z.string().max(80), warranty: z.string().max(120) }))
          .max(3),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase
      .from("service_requests")
      .select("id, customer_id, expected_price_low, expected_price_high, scope_of_work")
      .eq("id", data.jobId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!job) throw new Error("Job not found");
    const low = Number(job.expected_price_low) || 100;
    const high = Number(job.expected_price_high) || low * 2;
    const mid = (low + high) / 2;
    const spread = [0.92, 1.05, 1.28];
    const rows = data.pros.map((p, i) => ({
      job_id: job.id,
      provider_id: null,
      provider_name_snapshot: p.name,
      price: Math.round(mid * (spread[i] ?? 1)),
      earliest_availability: p.availability,
      included_work: job.scope_of_work.slice(0, 4),
      warranty: p.warranty,
      notes: "Sample quote generated against your standardized scope.",
      is_demo: true,
      status: "pending" as const,
    }));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("provider_quotes").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Owner alert for a "Request a pro" submission (no verified pro covers the ZIP yet). */
export const notifyPendingMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { data: j } = await context.supabase
        .from("service_requests")
        .select("id, category_label, problem_statement, service_address, preferred_date, preferred_window, contact_phone, expected_price_low, expected_price_high, created_at")
        .eq("id", data.jobId)
        .eq("customer_id", context.userId)
        .maybeSingle();
      if (!j) return { ok: false };
      const email = (context.claims as { email?: string } | undefined)?.email ?? null;
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", context.userId)
        .maybeSingle();
      const zip = /\b(\d{5})(?:-\d{4})?\b/.exec(j.service_address)?.[1] ?? null;
      const price = Number(j.expected_price_high) > 0 ? `Est. $${j.expected_price_low}–$${j.expected_price_high}` : "Pro will quote";
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("internal-lead", "", {
        templateData: {
          leadType: "booking",
          name: (profile as { full_name?: string } | null)?.full_name ?? null,
          email,
          phone: j.contact_phone,
          service: j.category_label,
          businessName: "Needs matching — no verified pro in ZIP",
          location: j.service_address,
          zip,
          note: [`${j.preferred_date ?? ""} ${j.preferred_window ?? ""}`.trim(), `Phone: ${j.contact_phone ?? "—"}`, price, j.problem_statement]
            .filter(Boolean)
            .join(" — "),
          source: "request a pro (/snap, pending match)",
          submittedAt: j.created_at,
        },
        idempotencyKey: `internal-pending-match-${j.id}`,
        replyTo: email || undefined,
      });
      return { ok: true };
    } catch (err) {
      console.error("[booking-actions] Pending-match notification failed:", err);
      return { ok: false };
    }
  });
