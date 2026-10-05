import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthForm } from "@/components/getpros/AuthForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — GetPros" },
      { name: "description", content: "Log in to GetPros as a customer or service provider." },
      { property: "og:title", content: "Log in — GetPros" },
      { property: "og:description", content: "Log in to GetPros." },
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
      footer={<p>New to GetPros? <Link to="/register" search={{ redirect: undefined, role: undefined }} className="font-semibold text-primary">Create an account</Link></p>}
    />
  );
}
