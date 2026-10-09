import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/getpros/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GetPros.ai" },
      { name: "description", content: "The terms that apply when you use GetPros.ai." },
      { property: "og:title", content: "Terms of Service — GetPros.ai" },
      { property: "og:description", content: "The terms that apply when you use GetPros.ai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Terms of Service — GetPros.ai" },
      { name: "twitter:description", content: "The terms that apply when you use GetPros.ai." },
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
          <p className="text-xs font-semibold text-foreground/70">Last updated October 9, 2026</p>
          <p>
            GetPros is a marketplace: work is done by independent professionals. Prices shown before a pro confirms are
            estimates, not quotes. Do not use GetPros for emergencies that need 911.
          </p>
          <h2 className="pt-2 text-base font-bold text-foreground">Payments</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Payments are processed by Stripe. Pros are paid through their own Stripe account; GetPros keeps a 15% platform fee from the pro's share, and customers pay a 5% service fee shown before booking.</li>
            <li>Your card is saved when you book but not charged. A hold for the total is placed 2 days before the job (or when the pro accepts, if the job is sooner).</li>
            <li>After the pro marks the job complete, you can approve and pay. If you don't respond within 48 hours, the held amount is charged automatically. Contact info@getpros.ai before then if there's a problem.</li>
            <li>Cancelling more than 24 hours before the start is free. Customer cancellations within 24 hours of an accepted job cost $25. If the pro cancels or declines, any hold is released.</li>
            <li>Refunds and disputes are handled by your pro through their Stripe account and go back to the original card. If you can't resolve an issue with your pro, contact info@getpros.ai.</li>
          </ul>
          <p>
            For a summary of how the service works today, see{" "}
            <Link to="/legal" className="font-semibold text-primary">Privacy, terms & accessibility</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
