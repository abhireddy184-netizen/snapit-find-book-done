import { ORGANIZATION_JSONLD } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowRight, Sparkles, ShieldCheck, MapPin } from "lucide-react";
import { AppShell } from "@/components/getpros/AppShell";
import { catalog, searchServices, TOTAL_SERVICES, getMarket, serviceEligibility, formatPrice } from "@/lib/catalog";
import { categoryScene } from "@/lib/scenes";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "All Services — GetPros.ai" },
      { name: "description", content: `Browse ${TOTAL_SERVICES}+ home, outdoor, auto and at-home beauty services across ${catalog.length} GetPros categories. Search a job, see typical pricing and get matched with a local professional.` },
      { property: "og:title", content: "All Services — GetPros.ai" },
      { property: "og:description", content: "Every GetPros service in one place — plumbing to at-home beauty, with typical price guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "All Services — GetPros.ai" },
      { name: "twitter:description", content: `Browse ${TOTAL_SERVICES}+ home, outdoor, auto and at-home beauty services across ${catalog.length} GetPros categories. Search a job, see typical pricing and get matched with a local professional.` },
    ],
    scripts: [ORGANIZATION_JSONLD],
  }),
  component: AllServicesPage,
});

function AllServicesPage() {
  const [q, setQ] = useState("");
  const market = getMarket();
  const results = useMemo(() => searchServices(q), [q]);

  return (
    <AppShell>
      <section className="mt-4 overflow-hidden rounded-2xl px-6 py-10 md:px-12 md:py-14 plum-panel">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
          <MapPin className="h-3.5 w-3.5" /> {market.name} · {market.currency}
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Prefer to browse? Choose a service.</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
          {catalog.length} master categories and {TOTAL_SERVICES} sub-services — from plumbing and mounting to lawn care,
          mobile auto and at-home beauty. You never have to pick one: tell GetPros the outcome and we’ll work it out.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white/12 px-4 py-3 ring-1 ring-white/20 backdrop-blur">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a job — TV mounting, sunken sofa, blowout…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/60"
            />
          </label>
          <Link
            to="/snap"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-plum shadow-elevated transition-transform hover:scale-[1.01]"
          >
            <Sparkles className="h-4 w-4" /> Show us what you need
          </Link>
        </div>
      </section>

      {q.trim() && (
        <section className="mt-8">
          <h2 className="text-lg font-black">
            {results.length} match{results.length === 1 ? "" : "es"} for “{q.trim()}”
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map(({ category, service }) => (
              <ServiceRow key={`${category.slug}/${service.slug}`} categorySlug={category.slug} categoryName={category.name} slug={service.slug} name={service.name} blurb={service.blurb} price={formatPrice(service.priceLow, service.priceHigh)} />
            ))}
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No exact match. Try describing it on the{" "}
                <Link to="/snap" className="font-semibold text-primary underline">Show us</Link> page instead.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-10 space-y-10">
        {catalog.map((cat) => {
          const Icon = cat.icon;
          const { licenseRequired } = serviceEligibility(cat.slug);
          return (
            <div key={cat.slug} id={cat.slug} className="scroll-mt-24">
              <div className="flex items-start gap-4">
                {categoryScene(cat.slug) ? (
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl shadow-card">
                    <img
                      src={categoryScene(cat.slug)}
                      alt={`${cat.name} professional at work`}
                      loading="lazy"
                      decoding="async"
                      sizes="(min-width:1024px) 25vw, 50vw"
                      width={768}
                      height={512}
                      className="h-full w-full object-cover"
                    />
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-25`} />
                    <div className="absolute bottom-1 left-1 grid h-6 w-6 place-items-center rounded-lg bg-card/85 backdrop-blur">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-card`}>
                    <Icon className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{cat.name}</h2>
                    {licenseRequired && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" /> License/qualification checks where required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.tagline}</p>
                </div>
                <Link
                  to="/services/$category"
                  params={{ category: cat.slug }}
                  className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
                >
                  View <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.services.map((sv) => (
                  <ServiceRow
                    key={sv.slug}
                    categorySlug={cat.slug}
                    categoryName={cat.name}
                    slug={sv.slug}
                    name={sv.name}
                    blurb={sv.blurb}
                    price={formatPrice(sv.priceLow, sv.priceHigh)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}

function ServiceRow({
  categorySlug, categoryName, slug, name, blurb, price,
}: { categorySlug: string; categoryName: string; slug: string; name: string; blurb: string; price: string }) {
  return (
    <Link
      to="/services/$category/$service"
      params={{ category: categorySlug, service: slug }}
      className="card-lift group flex h-full flex-col surface-card p-4 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-elevated"
    >
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{categoryName}</div>
      <div className="mt-1 text-sm font-black">{name}</div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{blurb}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-bold text-primary">{price}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
