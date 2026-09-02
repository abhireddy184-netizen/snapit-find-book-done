import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

/**
 * Client-side session gate.
 *
 * The check runs in an effect rather than `beforeLoad` on purpose: redirecting
 * before hydration made the client render the login tree into the SSR shell for
 * this route, which React reports as a hydration mismatch. Rendering `null` on
 * the first pass matches the server output exactly, then the redirect happens as
 * an ordinary client navigation — with the intended redirect-back search param.
 */
function AuthGate() {
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const [state, setState] = useState<"checking" | "allowed">("checking");

  const initialHref = useRef(href);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        void navigate({ to: "/login", search: { redirect: initialHref.current }, replace: true });
      } else {
        setState("allowed");
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (state !== "allowed") return null;
  return <Outlet />;
}
