import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_ROLE_KEY, clearIntent, readIntent, reconcileProfile } from "@/lib/oauth-intent";
import { notifyNewAccount } from "@/lib/account-notify.functions";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — GetPros.ai" },
      { name: "description", content: "Finishing sign-in to GetPros.ai." },
      { property: "og:title", content: "Signing you in — GetPros.ai" },
      { property: "og:description", content: "Finishing sign-in to GetPros.ai." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.slice(1));
    const urlErr = params.get("error_description") || params.get("error");
    if (urlErr) {
      setError(urlErr);
      clearIntent();
      return;
    }

    async function finish(userId: string) {
      if (done) return;
      done = true;
      try {
        const stored = readIntent();
        const q = new URLSearchParams(window.location.search).get("role");
        let pending: string | null = null;
        try { pending = localStorage.getItem(PENDING_ROLE_KEY); } catch { /* ignore */ }
        const r = q === "customer" || q === "provider" ? q : pending === "customer" || pending === "provider" ? pending : null;
        const intent = { role: r, redirect: stored?.redirect ?? null, at: Date.now() } as const;
        const { role, conflict } = await reconcileProfile(userId, intent);
        if (conflict) {
          clearIntent();
          window.location.replace(`/register?${r === "provider" ? "role=provider&" : ""}conflict=${role}`);
          return;
        }
        void notifyNewAccount({ data: { userId } }).catch(() => {});
        clearIntent();
        if (intent?.redirect) {
          window.location.replace(intent.redirect);
          return;
        }
        await navigate({ to: role === "provider" ? "/provider-dashboard" : "/dashboard", replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not finish sign-in.");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) void finish(session.user.id);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) void finish(data.session.user.id);
    });
    const t = window.setTimeout(() => {
      if (!done) setError("Sign-in didn't complete. Please try again.");
    }, 15000);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 pt-[env(safe-area-inset-top)]">
      {error ? (
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 font-semibold">Sign-in failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Link to="/login" search={{ redirect: undefined }} className="mt-4 inline-block font-semibold text-primary">
            Back to log in
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
        </div>
      )}
    </div>
  );
}
