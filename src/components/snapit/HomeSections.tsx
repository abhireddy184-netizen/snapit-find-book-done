import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Brain, UserCheck, ShieldCheck, Sparkles, Sparkle, Wrench, Zap, Wind, Hammer, Leaf, SprayCan, Grid3x3 } from "lucide-react";
import { catalog, getCategoryBySlug, type SubService } from "@/lib/catalog";
import { serviceScene } from "@/lib/scenes";

/* ---------------- AI journey: 4 compact steps ---------------- */

const STEPS = [
  { icon: Camera, label: "Show it", hint: "Photo, video or text" },
  { icon: Brain, label: "Understand it", hint: "Likely issue & scope" },
  { icon: UserCheck, label: "Match a pro", hint: "Right service, near you" },
  { icon: ShieldCheck, label: "Proof", hint: "Before & after kept" },
];

export function AiJourneyStrip() {
  return (
    <ol className="gpb-edge-md flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
      {STEPS.map((s, i) => (
        <li
          key={s.label}
          className="flex min-w-[70%] snap-start items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-sm min-[430px]:min-w-[58%] md:min-w-0"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: i === 0 ? "var(--gradient-primary)" : "color-mix(in oklab, var(--secondary) 82%, var(--primary))" }}
          >
            <s.icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black leading-tight text-foreground">{s.label}</span>
            <span className="block text-xs leading-tight text-muted-foreground">{s.hint}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Compact category icon row ---------------- */

const QUICK = [
  { slug: "cleaning", label: "Cleaning", icon: SprayCan, tint: "var(--mint-ink)" },
  { slug: "beauty-at-home", label: "Beauty", icon: Sparkle, tint: "var(--primary)" },
  { slug: "plumbing", label: "Plumbing", icon: Wrench, tint: "var(--coral-ink)" },
  { slug: "electrical", label: "Electrical", icon: Zap, tint: "var(--sky-ink)" },
  { slug: "hvac", label: "AC / HVAC", icon: Wind, tint: "var(--secondary)" },
  { slug: "handyman", label: "Handyman", icon: Hammer, tint: "var(--lavender)" },
  { slug: "lawn-outdoor", label: "Lawn", icon: Leaf, tint: "var(--success)" },
];

export function CategoryIconRow() {
  return (
    <div className="gpb-edge-sm flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-8 sm:gap-3 sm:overflow-visible">
      {QUICK.map((c) => (
        <Link
          key={c.slug}
          to="/services/$category"
          params={{ category: c.slug }}
          className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-auto"
        >
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl border border-border/60 bg-card shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-card"
            style={{ color: c.tint }}
          >
            <c.icon className="h-6 w-6" />
          </span>
          <span className="w-full truncate text-center text-xs font-semibold text-foreground">{c.label}</span>
        </Link>
      ))}
      <Link to="/services" className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-auto">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-all group-hover:-translate-y-0.5">
          <Grid3x3 className="h-6 w-6" />
        </span>
        <span className="w-full truncate text-center text-xs font-semibold text-foreground">More</span>
      </Link>
    </div>
  );
}

/* ---------------- Compact service discovery rows ---------------- */

type RowItem = { categorySlug: string; service: SubService };

function pick(categorySlug: string, count: number, featuredFirst = true): RowItem[] {
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return [];
  const list = featuredFirst
    ? [...cat.services].sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    : cat.services;
  return list.slice(0, count).map((service) => ({ categorySlug, service }));
}

function mix(slugs: string[], perCat = 2): RowItem[] {
  return slugs.flatMap((s) => pick(s, perCat));
}

export const HOME_ROWS: { title: string; seeAll: string; items: RowItem[] }[] = [
  { title: "Popular services", seeAll: "/services", items: mix(["cleaning", "plumbing", "electrical", "handyman"], 2) },
  { title: "Beauty at Home", seeAll: "/services/beauty-at-home", items: pick("beauty-at-home", 8) },
  { title: "Home repairs", seeAll: "/services/handyman", items: mix(["mounting-installation", "appliances", "painting", "walls-drywall"], 2) },
  { title: "Outdoor & quick jobs", seeAll: "/services/lawn-outdoor", items: mix(["lawn-outdoor", "junk-removal", "exterior-cleaning"], 2) },
];

export function ServiceRow({ title, seeAll, items }: { title: string; seeAll: string; items: RowItem[] }) {
  if (items.length === 0) return null;
  // A scene photo is only shown once per row; repeats fall back to a clean icon tile.
  const used = new Set<string>();
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-black tracking-tight sm:text-xl">{title}</h2>
        <Link to={seeAll} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="gpb-edge-md mt-3 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible xl:grid-cols-5 2xl:grid-cols-6">
        {items.map(({ categorySlug, service }) => {
          const raw = serviceScene(categorySlug, service.slug);
          const img = raw && !used.has(raw) ? raw : undefined;
          if (raw) used.add(raw);
          const CatIcon = getCategoryBySlug(categorySlug)?.icon ?? Sparkles;
          return (
            <Link
              key={`${categorySlug}/${service.slug}`}
              to="/services/$category/$service"
              params={{ category: categorySlug, service: service.slug }}
              className="group w-[154px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card min-[430px]:w-[168px] md:w-auto"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                {img ? (
                  <img
                    src={img}
                    alt={service.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span
                    className="grid h-full w-full place-items-center text-primary"
                    style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--card))" }}
                  >
                    <CatIcon className="h-7 w-7" />
                  </span>
                )}
              </div>
               <div className="flex min-h-14 flex-col justify-center p-3">
                 <div className="line-clamp-2 text-xs font-bold leading-tight text-foreground">{service.name}</div>
                 <div className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                   {getCategoryBySlug(categorySlug)?.name}
                 </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeRows() {
  return (
    <>
      {HOME_ROWS.map((r) => (
        <ServiceRow key={r.title} {...r} />
      ))}
    </>
  );
}

export const CATEGORY_COUNT = catalog.length;
export const SparklesIcon = Sparkles;
