import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthForm } from "@/components/snapit/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — SnapIt" },
      { name: "description", content: "Log in to SnapIt as a customer or service provider." },
      { property: "og:title", content: "Log in — SnapIt" },
      { property: "og:description", content: "Log in to SnapIt." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle="Log in to book services or manage your business."
      redirectTo={redirect}
      footer={<p>New to SnapIt? <Link to="/register" className="font-semibold text-primary">Create an account</Link></p>}
    />
  );
}
