import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, ShieldCheck, MapPin, Clock, Calendar as CalendarIcon } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { getProvider, type Provider } from "@/lib/snapit-data";
import { fetchProviderByUserId, isBookable, type PublicProvider } from "@/lib/providers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoaderData =
  | { kind: "demo"; provider: Provider }
  | { kind: "real"; provider: PublicProvider };

export const Route = createFileRoute("/provider/$id")({
  loader: async ({ params }): Promise<LoaderData> => {
    const demo = getProvider(params.id);
    if (demo) return { kind: "demo", provider: demo };
    if (UUID_RE.test(params.id)) {
      const real = await fetchProviderByUserId(params.id).catch(() => null);
      if (real) return { kind: "real", provider: real };
    }
    throw notFound();
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Provider — GetPros" }, { name: "robots", content: "noindex" }] };
    const name = loaderData.kind === "demo" ? loaderData.provider.name : loaderData.provider.business_name;
    const desc =
      loaderData.kind === "demo"
        ? loaderData.provider.description
        : loaderData.provider.bio || `${loaderData.provider.business_name} on GetPros.ai`;
    return {
      meta: [
        { title: `${name} — GetPros` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — GetPros` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md surface-card p-6 text-center">
        <h1 className="text-xl font-black">We couldn't load this profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md surface-card p-6 text-center">
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
  component: ProviderRoute,
});

function ProviderRoute() {
  const data = Route.useLoaderData() as LoaderData;
  return data.kind === "real" ? <RealProviderPage p={data.provider} /> : <ProviderPage p={data.provider} />;
}

function RealProviderPage({ p }: { p: PublicProvider }) {
  const initials = p.business_name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const bookable = isBookable(p);
  return (
    <AppShell>
      <section className="mt-4 overflow-hidden surface-card">
        <div className="h-24 sm:h-32" style={{ background: "var(--gradient-primary)" }} />
        <div className="p-5 sm:p-6">
          <div className="-mt-14 flex min-w-0 items-end gap-4">
            <Avatar initials={initials || "GP"} gradient="from-primary to-secondary" size={80} />
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-xl font-black sm:text-2xl">{p.business_name}</h1>
                {p.verification_status === "verified" && <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified by GetPros" />}
              </div>
              {p.service_category && <div className="truncate text-sm text-muted-foreground">{p.service_category}</div>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {(p.service_area || p.service_zip) && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {p.service_area || p.service_zip}{p.service_radius_miles ? ` · up to ${p.service_radius_miles} mi` : ""}</span>
            )}
            {p.starting_price != null && <span className="font-semibold text-foreground">From ${Number(p.starting_price).toFixed(0)}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> ~{p.default_duration_minutes} min jobs</span>
          </div>
          {p.bio && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{p.bio}</p>}
          <div className="mt-5">
            {bookable ? (
              <Link to="/book" search={{ provider: p.user_id, job: undefined, service: undefined, category: undefined }}>
                <GradientButton className="w-full sm:w-auto"><CalendarIcon className="h-4 w-4" /> Book this pro</GradientButton>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">This pro isn't taking new bookings right now.</p>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function ProviderPage({ p }: { p: Provider }) {
  const selectedDay = 0;
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const slots = ["9:00 AM", "11:00 AM", "1:00 PM", "3:30 PM", "5:00 PM"];

  return (
    <AppShell>
      <section className="mt-4 overflow-hidden surface-card">
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
                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Demo profile</span>
              </div>
            </div>
            <Link
              to="/search"
              search={{ q: p.category ?? "", loc: "", pros: 1 }}
              className="shrink-0 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Find bookable pros
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
        <div className="surface-card divide-y divide-border/60">
          {p.services.map((s) => (
            <div key={s.name} className="flex items-center justify-between p-4">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-sm font-bold text-primary">{s.price}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Availability (example)">
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">
            This is an example profile. The days and times below are illustrative and are not live availability.
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-hidden="true">
            {days.map((d, i) => (
              <div
                key={i}
                className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 text-xs font-semibold ${selectedDay === i ? "border-primary text-primary" : "border-border bg-background text-muted-foreground"}`}
              >
                <span>{d.toLocaleDateString("en", { weekday: "short" })}</span>
                <span className="text-base">{d.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-hidden="true">
            {slots.map((s) => (
              <div key={s} className="rounded-full border border-dashed border-border bg-muted/40 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                {s}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link to="/search" search={{ q: p.category ?? "", loc: "", pros: 1 }}>
              <GradientButton className="w-full">
                <CalendarIcon className="h-4 w-4" /> Find bookable pros
              </GradientButton>
            </Link>
          </div>
        </div>
      </Section>


      <Section title={`Reviews (${p.reviews})`}>
        <div className="space-y-3">
          {p.reviewList.map((r) => (
            <div key={r.name} className="surface-card p-4">
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