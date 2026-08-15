import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Camera, ShieldCheck, Sparkles } from "lucide-react";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/snapit/AppShell";
import { getCategoryBySlug, serviceEligibility, formatPrice, type SubService, type MasterCategory } from "@/lib/catalog";
import { serviceScene } from "@/lib/scenes";

export const Route = createFileRoute("/services/$category/")({
  loader: ({ params }) => {
    const category = getCategoryBySlug(params.category);
    if (!category) throw notFound();
    return { name: category.name, tagline: category.tagline, slug: category.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Service not found — GPB" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} Services — GPB | GetPerfectBoy.com`;
    return {
      meta: [
        { title },
        { name: "description", content: `${loaderData.tagline} Compare GPB ${loaderData.name.toLowerCase()} sub-services, typical pricing and local professionals.` },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.tagline },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category: slug } = Route.useParams();
  const category = getCategoryBySlug(slug)!;
  const Icon = category.icon;
  const { market, licenseRequired } = serviceEligibility(slug);

  return (
    <AppShell>
      <nav className="pt-4 text-xs text-muted-foreground">
        <Link to="/services" className="hover:text-foreground">All services</Link> <span className="px-1">/</span>
        <span className="font-semibold text-foreground">{category.name}</span>
      </nav>

      <section className={`mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br ${category.gradient} px-6 py-10 text-white md:px-12 md:py-14`}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{category.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/90 md:text-base">{category.tagline}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{category.services.length} services</span>
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">Available in {market.name}</span>
          {licenseRequired && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              <ShieldCheck className="h-3 w-3" /> License/qualification checks where required
            </span>
          )}
        </div>
        <Link
          to="/snap"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-plum shadow-lg transition-transform hover:scale-[1.02]"
        >
          <Camera className="h-4 w-4" /> Show us the problem
        </Link>
      </section>

      {/* Every sub-service is listed here, in full, before any secondary content. */}
      <ServicePicker category={category} />

      {(licenseRequired || slug === "beauty-at-home") && (
        <p className="mt-4 rounded-2xl border border-border/60 bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {slug === "beauty-at-home"
            ? "At-home beauty availability varies by state/local rules and provider licensing."
            : "Local licensing or qualification requirements may apply depending on the job and location. GPB should match regulated work only to appropriately qualified providers where required by local law."}
        </p>
      )}
    </AppShell>
  );
}

function ServicePicker({ category }: { category: MasterCategory }) {
  const [query, setQuery] = useState("");
  const services: SubService[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return category.services;
    return category.services.filter(
      (sv) => sv.name.toLowerCase().includes(q) || sv.blurb.toLowerCase().includes(q),
    );
  }, [category.services, query]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Choose a service</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All {category.services.length} {category.name.toLowerCase()} services — nothing hidden.
          </p>
        </div>
        {category.services.length > 8 && (
          <label className="flex w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 sm:w-72">
            <SearchIcon className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${category.name.toLowerCase()} services`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((sv) => (
          <Link
            key={sv.slug}
            to="/services/$category/$service"
            params={{ category: category.slug, service: sv.slug }}
            className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm hover:-translate-y-1 hover:border-secondary/40 hover:shadow-xl"
          >
            {serviceScene(category.slug, sv.slug) && (
              <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
                <img
                  src={serviceScene(category.slug, sv.slug)}
                  alt={`${sv.name} — ${category.name}`}
                  loading="lazy"
                  decoding="async"
                  width={768}
                  height={512}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-black">{sv.name}</h3>
              {sv.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              )}
            </div>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{sv.blurb}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-bold text-primary">{formatPrice(sv.priceLow, sv.priceHigh)}{sv.unit ? ` ${sv.unit}` : ""}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            </div>
          </Link>
        ))}
      </div>

      {services.length === 0 && (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No {category.name.toLowerCase()} service matches “{query}”.
        </p>
      )}
    </section>
  );
}
