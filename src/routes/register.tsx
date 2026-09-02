import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthForm } from "@/components/snapit/AuthForm";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
    role: search['role'] === "provider" ? ("provider" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign up — GetPros" },
      { name: "description", content: "Create your GetPros account as a customer or service provider." },
      { property: "og:title", content: "Sign up — GetPros" },
      { property: "og:description", content: "Create a GetPros account in seconds." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect, role } = Route.useSearch();
  return (
    <AuthForm
      mode="register"
      title={role === "provider" ? "Join GetPros as a pro" : "Create your account"}
      subtitle={
        role === "provider"
          ? "Set up your business profile and start receiving standardized job briefs."
          : "Show it. Tell us. Get it fixed. Get started in seconds."
      }
      initialRole={role ?? "customer"}
      redirectTo={redirect}
      footer={<p>Already have an account? <Link to="/login" search={{ redirect: undefined }} className="font-semibold text-primary">Log in</Link></p>}
    />
  );
}
