import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler hook: places card holds and automatic captures that are already due.
 * Requires the x-cron-secret header (CRON_SECRET). Takes no input and only acts on work whose time has passed, so extra calls are harmless.
 */
export const Route = createFileRoute("/api/public/payments/run-due")({
  server: {
    handlers: {
      GET: () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }),
      POST: async ({ request }) => {
        const expected = process.env["CRON_SECRET"];
        const got = request.headers.get("x-cron-secret");
        if (!expected || !got || got.length !== expected.length) return new Response("Unauthorized", { status: 401 });
        let diff = 0;
        for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
        if (diff !== 0) return new Response("Unauthorized", { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { processDuePayments } = await import("@/lib/payments.server");
          const r = await processDuePayments(supabaseAdmin);
          return Response.json(r);
        } catch (err) {
          console.error("[run-due] failed:", err instanceof Error ? err.message : err);
          return Response.json({ error: "run failed" }, { status: 500 });
        }
      },
    },
  },
});
