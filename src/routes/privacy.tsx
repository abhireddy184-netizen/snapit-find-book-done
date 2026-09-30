import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/snapit/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GetPros.ai" },
      { name: "description", content: "How GetPros.ai collects, uses and protects your information." },
      { property: "og:title", content: "Privacy Policy — GetPros.ai" },
      { property: "og:description", content: "How GetPros.ai collects, uses and protects your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Privacy Policy</h1>
        <div className="mt-6 surface-card space-y-3 p-5 text-sm leading-relaxed text-muted-foreground md:p-7">
          <p>Our full Privacy Policy is being prepared and will be published here soon.</p>
          <p>
            We collect only what the service needs — your account details, job details and any photos, video or voice you
            submit — and we never sell your data.
          </p>
          <p>
            To request deletion of your account, email{" "}
            <a className="font-semibold text-primary" href="mailto:privacy@getpros.ai">privacy@getpros.ai</a>.
            More detail:{" "}
            <Link to="/legal" className="font-semibold text-primary">Privacy, terms & accessibility</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
