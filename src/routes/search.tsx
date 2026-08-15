import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ShieldCheck, MapPin, Clock, SlidersHorizontal } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers, categories } from "@/lib/snapit-data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Find a Pro — SnapIt" },
      { name: "description", content: "Search vetted local professionals by category, rating, price and distance." },
      { property: "og:title", content: "Find a Pro — SnapIt" },
      { property: "og:description", content: "Search vetted local professionals near you." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [maxDist, setMaxDist] = useState(25);
  const [avail, setAvail] = useState<string>("any");
  const [showFilters, setShowFilters] = useState(false);

  const results = providers.filter((p) =>
    p.rating >= minRating &&
    p.startingPrice <= maxPrice &&
    p.distance <= maxDist &&
    (avail === "any" || p.availability.toLowerCase() === avail.toLowerCase())
  );

  return (
    <AppShell>
      <div className="pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate text-2xl font-black md:text-3xl">Pros near you</h1>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{results.length} pros match your filters</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Demo data — sample profiles shown while we onboard real local pros.</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} md:block rounded-2xl border border-border/60 bg-card p-5 shadow-sm h-fit md:sticky md:top-20`}>
          <h3 className="text-sm font-bold">Filters</h3>

          <FilterBlock label={`Minimum rating: ${minRating.toFixed(1)}★`}>
            <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={(e) => setMinRating(+e.target.value)} className="w-full accent-[oklch(0.58_0.19_265)]" />
          </FilterBlock>

          <FilterBlock label={`Max starting price: $${maxPrice}`}>
            <input type="range" min={20} max={500} step={10} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-[oklch(0.58_0.19_265)]" />
          </FilterBlock>

          <FilterBlock label={`Max distance: ${maxDist} mi`}>
            <input type="range" min={1} max={25} value={maxDist} onChange={(e) => setMaxDist(+e.target.value)} className="w-full accent-[oklch(0.58_0.19_265)]" />
          </FilterBlock>

          <FilterBlock label="Availability">
            <div className="mt-2 flex flex-wrap gap-2">
              {["any", "Today", "Tomorrow", "This week"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAvail(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${avail === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {a === "any" ? "Any time" : a}
                </button>
              ))}
            </div>
          </FilterBlock>

          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.slice(0, 6).map((c) => (
                <Link key={c.slug} to="/search" className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {results.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto]">
                <Avatar initials={p.initials} gradient={p.gradient} size={64} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="truncate text-lg font-bold">{p.name}</div>
                    {p.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.business}</div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating} <span className="font-normal text-muted-foreground">({p.reviews})</span>
                    </span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.distance} mi</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.availability}</span>
                    <span className="font-semibold text-primary">from ${p.startingPrice}</span>
                  </div>
                </div>
                <div className="col-span-2 flex flex-wrap gap-2 md:col-span-1 md:flex-col md:items-end md:justify-center">
                  <Link to="/provider/$id" params={{ id: p.id }} className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted">
                    View Profile
                  </Link>
                  <Link to="/book" search={{ provider: p.id }} className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md" style={{ background: "var(--gradient-primary)" }}>
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">No pros match your filters. Try widening your search.</p>
              <div className="mt-4 flex justify-center">
                <GradientButton onClick={() => { setMinRating(0); setMaxPrice(500); setMaxDist(25); setAvail("any"); }}>Reset filters</GradientButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}