import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/snapit/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GetPros.ai" },
      { name: "description", content: "The terms that apply when you use GetPros.ai." },
      { property: "og:title", content: "Terms of Service — GetPros.ai" },
      { property: "og:description", content: "The terms that apply when you use GetPros.ai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Terms of Service</h1>
        <div className="mt-6 surface-card space-y-3 p-5 text-sm leading-relaxed text-muted-foreground md:p-7">
          <p>Our full Terms of Service are being prepared and will be published here soon.</p>
          <p>
            GetPros is a marketplace: work is done by independent professionals. Prices shown before a pro confirms are
            estimates, not quotes. Do not use GetPros for emergencies that need 911.
          </p>
          <p>
            For a summary of how the service works today, see{" "}
            <Link to="/legal" className="font-semibold text-primary">Privacy, terms & accessibility</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
