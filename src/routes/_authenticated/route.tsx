import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

/** Module-level so a remount during the redirect cannot restart the check. */
let redirecting = false;

/**
 * Client-side session gate.
 *
 * The check runs in an effect rather than `beforeLoad` on purpose: redirecting
 * before hydration made the client render the login tree into this route's SSR
 * shell, which React reports as a hydration mismatch. Rendering `null` on the
 * first pass matches the server output exactly, then the redirect happens as an
 * ordinary client navigation — keeping the redirect-back search param.
 */
function AuthGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        if (redirecting) return;
        const target = window.location.pathname + window.location.search;
        if (window.location.pathname === "/login") return;
        redirecting = true;
        void navigate({ to: "/login", search: { next: target }, replace: true }).finally(() => {
          redirecting = false;
        });
      } else {
        setState("allowed");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) setState("checking");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state !== "allowed") return null;
  return <Outlet />;
}
