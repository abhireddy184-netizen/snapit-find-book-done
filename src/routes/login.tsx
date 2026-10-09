import { ORGANIZATION_JSONLD } from "@/lib/brand";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/getpros/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; next?: string; confirmed?: "1" } => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
    next: typeof search['next'] === "string" ? (search['next'] as string) : undefined,
    confirmed: search['confirmed'] === 1 || search['confirmed'] === "1" ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — GetPros.ai" },
      { name: "description", content: "Log in to GetPros as a customer or service provider." },
      { property: "og:title", content: "Log in — GetPros.ai" },
      { property: "og:description", content: "Log in to GetPros as a customer or service provider." },
      { name: "twitter:title", content: "Log in — GetPros.ai" },
      { name: "twitter:description", content: "Log in to GetPros as a customer or service provider." },
      { name: "robots", content: "noindex" },
    ],
    scripts: [ORGANIZATION_JSONLD],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, next, confirmed } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!confirmed) return;
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (!active) return;
      void navigate({ to: p?.role === "provider" ? "/provider-dashboard" : "/dashboard", replace: true });
    });
    return () => { active = false; };
  }, [confirmed, navigate]);
  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle="Log in to book services or manage your business."
      redirectTo={next ?? redirect}
      topNotice={confirmed ? "Your email is confirmed. Log in to continue." : undefined}
      footer={<p>New to GetPros? <Link to="/register" search={{ redirect: undefined, role: undefined }} className="font-semibold text-primary">Create an account</Link></p>}
    />
  );
}
