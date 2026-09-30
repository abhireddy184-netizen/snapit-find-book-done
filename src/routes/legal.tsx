import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/snapit/AppShell";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Privacy, Terms & Accessibility — GetPros" },
      {
        name: "description",
        content:
          "How GetPros.ai handles your data, what our terms of use cover, how we use cookies, and our accessibility commitment.",
      },
      { property: "og:title", content: "Privacy, Terms & Accessibility — GetPros" },
      { property: "og:description", content: "GetPros privacy, terms, cookies and accessibility information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Privacy, terms & accessibility</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          GetPros.ai is in active build-out. The summaries below describe how the product behaves today. Full legal
          documents are being prepared with counsel — until they are published here, these summaries are what applies.
        </p>

        <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
          {[
            ["privacy", "Privacy"],
            ["terms", "Terms"],
            ["cookies", "Cookies"],
            ["accessibility", "Accessibility"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted">
              {label}
            </a>
          ))}
        </nav>

        <Section id="privacy" title="Privacy">
          <p>
            We collect only what the service needs: the account details you enter (name, email, role), the job details,
            photos, videos or voice recordings you submit, and the location text you provide so we can match local pros.
          </p>
          <p>
            Photos, videos and voice audio you submit are sent to our AI providers to work out what the job is. They are
            not sold, and they are not used to advertise to you. Job records and any before/after proof stay attached to
            your account so you can refer back to them.
          </p>
          <p>
            You can request deletion of your account and its job records at any time by emailing{" "}
            <a className="font-semibold text-primary" href="mailto:info@getpros.ai">info@getpros.ai</a>.
          </p>
        </Section>

        <Section id="terms" title="Terms of use">
          <p>
            GetPros is a marketplace and coordination layer. Work is carried out by independent professionals, not by GetPros.
            Prices shown before a pro inspects the job are AI-generated estimates, not quotes, and the final price is the
            one your pro confirms.
          </p>
          <p>
            Provider listings marked as examples are demonstration profiles shown while real pros are onboarded — they are
            not bookable and are labelled as such wherever they appear.
          </p>
          <p>
            You are responsible for the accuracy of the job details and the address you supply. Do not use GetPros for
            emergencies that require 911 or your local emergency number.
          </p>
        </Section>

        <Section id="cookies" title="Cookies & local storage">
          <p>
            We use browser storage for the things that keep the app working: your signed-in session, your theme choice,
            your saved draft booking, and your diagnosis history on this device. We do not run third-party advertising
            cookies.
          </p>
          <p>Clearing your browser storage signs you out and removes locally saved diagnoses.</p>
        </Section>

        <Section id="accessibility" title="Accessibility">
          <p>
            We build GetPros to be usable with a keyboard and with screen readers, at readable text sizes, from small phones
            up to desktop. Status messages announce themselves, controls have labels, and colour is never the only way we
            convey meaning.
          </p>
          <p>
            If something is hard to use, tell us at{" "}
            <a className="font-semibold text-primary" href="mailto:info@getpros.ai">info@getpros.ai</a>{" "}
            and we will fix it and reply.
          </p>
        </Section>

        <div className="mt-10 text-sm">
          <Link to="/" className="font-semibold text-primary">
            ← Back to GetPros
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-24 surface-card p-5 md:p-7">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
