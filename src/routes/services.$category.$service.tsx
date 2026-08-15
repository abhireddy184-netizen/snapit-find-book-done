import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Camera, CheckCircle2, ShieldCheck, Clock, Info } from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { getService, serviceEligibility, formatPrice, providerPoolFor } from "@/lib/catalog";
import { providers } from "@/lib/snapit-data";

export const Route = createFileRoute("/services/$category/$service")({
  loader: ({ params }) => {
    const hit = getService(params.category, params.service);
    if (!hit) throw notFound();
    return { name: hit.service.name, blurb: hit.service.blurb, category: hit.category.name };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Service not found — GPB" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — ${loaderData.category} | GPB`;
    return {
      meta: [
        { title },
        { name: "description", content: `${loaderData.blurb} See typical GPB pricing for ${loaderData.name.toLowerCase()} and get matched with a vetted local professional.` },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.blurb },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const params = Route.useParams();
  const { category, service } = getService(params.category, params.service)!;
  const { market, licenseRequired } = serviceEligibility(category.slug);
  const needsLicense = licenseRequired && service.licensed;
  const pool = providerPoolFor(category.slug);
  const matched = providers.filter((p) => p.category === pool).slice(0, 3);
  const Icon = category.icon;

  return (
    <AppShell>
      <nav className="pt-4 text-xs text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">All services</Link> <span className="px-1">/</span>
        <Link to="/services/$category" params={{ category: category.slug }} className="hover:text-foreground">{category.name}</Link>
        <span className="px-1">/</span>
        <span className="font-semibold text-foreground">{service.name}</span>
      </nav>

      <section className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-br ${category.gradient} px-3 py-1 text-xs font-bold text-white`}>
            <Icon className="h-3.5 w-3.5" /> {category.name}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{service.name}</h1>
          <p className="mt-3 text-base text-muted-foreground">{service.blurb}</p>

          <div className="mt-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">What's typically included</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                `On-site assessment of the ${service.name.toLowerCase()} request`,
                "Upfront quote against one standardized job scope",
                "Work completed with materials and clean-up",
                "Before & after photos kept in your job record",
              ].map((li) => (
                <li key={li} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/90">{li}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Common questions</h2>
            <div className="mt-3 space-y-4 text-sm">
              <Faq q={`How much does ${service.name.toLowerCase()} cost?`} a={`Most ${market.name} jobs land between ${formatPrice(service.priceLow, service.priceHigh)}${service.unit ? ` ${service.unit}` : ""}. Your pro confirms the final price after seeing the job — GPB never invents a price without enough information.`} />
              <Faq q="How fast can someone come out?" a="Availability depends on your area and how many GPB pros are onboarded there. Urgent issues can be flagged through emergency dispatch." />
              <Faq q="Do I need a photo?" a="No. You can simply describe the job. A photo or short video usually gets you a sharper match, but text alone works fine on desktop." />
              {needsLicense && (
                <Faq
                  q="Could this work need a licensed professional?"
                  a="Local licensing or qualification requirements may apply depending on the job and location. GPB should match regulated work only to appropriately qualified providers where required by local law."
                />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typical price guidance</div>
            <div className="mt-1 text-3xl font-black text-primary">{formatPrice(service.priceLow, service.priceHigh)}</div>
            <div className="text-xs text-muted-foreground">{service.unit ?? "typical job total"} · {market.currency}</div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> Most visits complete in a single appointment</div>
              {needsLicense && (
                <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> License/qualification checks where required</div>
              )}
              {category.slug === "beauty-at-home" && (
                <div className="flex items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> At-home beauty availability varies by state/local rules and provider licensing.</div>
              )}
              <div className="flex items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Guidance only — the real quote comes from your pro.</div>
            </div>
            <Link to="/snap" className="mt-5 block">
              <GradientButton className="w-full justify-center">
                <Camera className="h-4 w-4" /> Show us what you need
              </GradientButton>
            </Link>
            <Link
              to="/search"
              search={{ q: service.name, loc: "" } as never}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"
            >
              Browse pros <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black">Providers</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sample profiles</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Example listings shown while GPB onboards verified pros in your area.
            </p>
            <div className="mt-3 space-y-2">
              {matched.map((p) => (
                <Link
                  key={p.id}
                  to="/provider/$id"
                  params={{ id: p.id }}
                  className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="truncate font-semibold">{p.business}</span>
                  <span className="text-xs text-muted-foreground">★ {p.rating}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black">More {category.name.toLowerCase()} services</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {category.services.filter((x) => x.slug !== service.slug).slice(0, 6).map((sv) => (
            <Link
              key={sv.slug}
              to="/services/$category/$service"
              params={{ category: category.slug, service: sv.slug }}
              className="card-lift rounded-2xl border border-border/60 bg-card p-4 text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg"
            >
              {sv.name}
              <div className="mt-1 text-xs font-normal text-muted-foreground">{formatPrice(sv.priceLow, sv.priceHigh)}</div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <div className="font-bold">{q}</div>
      <p className="mt-1 text-muted-foreground">{a}</p>
    </div>
  );
}
