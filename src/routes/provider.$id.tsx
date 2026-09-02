import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ShieldCheck, MapPin, Clock, Calendar as CalendarIcon } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { getProvider, type Provider } from "@/lib/snapit-data";

export const Route = createFileRoute("/provider/$id")({
  loader: ({ params }) => {
    const provider = getProvider(params.id);
    if (!provider) throw notFound();
    return { provider };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.provider.name} — GetPros` },
          { name: "description", content: loaderData.provider.description },
          { property: "og:title", content: `${loaderData.provider.name} — GetPros` },
          { property: "og:description", content: loaderData.provider.description },
        ]
      : [{ title: "Provider — GetPros" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-6 text-center">
        <h1 className="text-xl font-black">This pro profile isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The profile may have been removed, or the link is out of date. Search for another pro in your area.
        </p>
        <Link to="/search" search={{ q: "", loc: "" }} className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Find a pro
        </Link>
      </div>
    </AppShell>
  ),
  component: ProviderPage,
});

function ProviderPage() {
  const { provider: p } = Route.useLoaderData() as { provider: Provider };
  const [selectedDay, setSelectedDay] = useState(0);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const slots = ["9:00 AM", "11:00 AM", "1:00 PM", "3:30 PM", "5:00 PM"];

  return (
    <AppShell>
      <section className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className={`h-32 bg-gradient-to-br ${p.gradient}`} />
        <div className="p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 -mt-14">
              <Avatar initials={p.initials} gradient={p.gradient} size={80} />
              <div className="min-w-0 pt-10">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xl font-black sm:text-2xl">{p.name}</h1>
                  {p.verified && <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />}
                </div>
                <div className="truncate text-sm text-muted-foreground">{p.business}</div>
                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Demo profile</span>
              </div>
            </div>
            <Link to="/book" search={{ provider: p.id }} className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md" style={{ background: "var(--gradient-primary)" }}>
              Book Now
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {p.rating} <span className="font-normal text-muted-foreground">({p.reviews} reviews)</span></span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {p.distance} mi · {p.serviceArea}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> {p.availability}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>
        </div>
      </section>

      <Section title="Recent work">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {p.photos.map((g, i) => (
            <div key={i} className={`aspect-square rounded-2xl bg-gradient-to-br ${g} shadow-sm`} />
          ))}
        </div>
      </Section>

      <Section title="Services & pricing">
        <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
          {p.services.map((s) => (
            <div key={s.name} className="flex items-center justify-between p-4">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-sm font-bold text-primary">{s.price}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 text-xs font-semibold ${selectedDay === i ? "border-primary bg-primary text-white" : "border-border bg-background text-foreground"}`}
              >
                <span>{d.toLocaleDateString("en", { weekday: "short" })}</span>
                <span className="text-base">{d.getDate()}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button key={s} className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary">
                {s}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Link to="/book" search={{ provider: p.id }}>
              <GradientButton className="w-full">
                <CalendarIcon className="h-4 w-4" /> Book this pro
              </GradientButton>
            </Link>
          </div>
        </div>
      </Section>

      <Section title={`Reviews (${p.reviews})`}>
        <div className="space-y-3">
          {p.reviewList.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.date}</div>
              </div>
              <div className="mt-1 flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}