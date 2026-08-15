import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthForm } from "@/components/snapit/AuthForm";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign up — GPB" },
      { name: "description", content: "Create your GPB account as a customer or service provider." },
      { property: "og:title", content: "Sign up — GPB" },
      { property: "og:description", content: "Create a GPB account in seconds." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  return (
    <AuthForm
      mode="register"
      title="Create your account"
      subtitle="Show it. Tell us. Get it done. Get started in seconds."
      redirectTo={redirect}
      footer={<p>Already have an account? <Link to="/login" search={{ redirect: undefined }} className="font-semibold text-primary">Log in</Link></p>}
    />
  );
}
