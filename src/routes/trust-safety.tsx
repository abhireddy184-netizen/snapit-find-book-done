import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Phone, CheckCircle2, Camera } from "lucide-react";
import { AppShell } from "@/components/snapit/AppShell";

export const Route = createFileRoute("/trust-safety")({
  head: () => ({
    meta: [
      { title: "Trust & Safety — GetPros.ai" },
      { name: "description", content: "How GetPros verifies pros, why nothing is booked until you confirm, proof-of-work photos, and what to do in an emergency." },
      { property: "og:title", content: "Trust & Safety — GetPros.ai" },
      { property: "og:description", content: "Verified pros, nothing booked until you confirm, and proof of finished work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrustSafetyPage,
});

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "How pros are verified",
    body: "Every pro who signs up starts as not approved. Our team reviews their business details, service area and contact information before they can be seen or booked. Where a trade needs a license or qualification, we ask for it. Example profiles on the site are clearly labelled as examples.",
  },
  {
    icon: CheckCircle2,
    title: "Nothing is booked until you confirm",
    body: "Showing us a photo or describing a job never books anyone. You see the matched service, pros and details first, and a booking is only made when you confirm it yourself.",
  },
  {
    icon: Camera,
    title: "Proof of work",
    body: "Pros can add before and after photos to a job, so you have a clear record of what was done.",
  },
];

function TrustSafetyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Trust &amp; safety</h1>
        <p className="mt-3 text-sm text-muted-foreground">How GetPros keeps customers and pros safe.</p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p>
            <strong>In an emergency, call 911 first.</strong> Fire, gas leaks, flooding near electrics or anyone in danger
            needs emergency services — GetPros is not an emergency service.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <section key={title} className="surface-card p-5">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <h2 className="text-lg font-black">{title}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Read our <Link to="/legal" hash="terms" className="font-semibold text-primary underline">terms</Link> and{" "}
          <Link to="/legal" hash="privacy" className="font-semibold text-primary underline">privacy</Link> summaries.
        </p>
      </div>
    </AppShell>
  );
}
