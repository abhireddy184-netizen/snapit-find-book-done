import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler hook: places card holds and automatic captures that are already due.
 * Takes no input and only acts on work whose time has passed, so extra calls are harmless.
 */
export const Route = createFileRoute("/api/public/payments/run-due")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { processDuePayments } = await import("@/lib/payments.server");
        const r = await processDuePayments(supabaseAdmin);
        return Response.json(r);
      },
    },
  },
});
