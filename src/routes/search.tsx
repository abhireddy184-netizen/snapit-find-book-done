import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import { Star, ShieldCheck, MapPin, Clock, Search as SearchIcon, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers as demoProviders } from "@/lib/snapit-data";
import { catalog, searchServices } from "@/lib/catalog";
import { matchServiceIntent, rankServices, rememberLocation, isServicePhrase } from "@/lib/search-intent";
import { fetchPublicProviders, matchProviders, type ProviderMatch } from "@/lib/providers";
import { useResolvedLocation } from "@/lib/us-zip";

type SearchParams = { q: string; loc: string };

/**
 * TanStack's default search parser JSON-decodes values, so `?loc=75034`
 * arrives as the number 75034. Coerce back to a ZIP-shaped string.
 */
function toSearchString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 100000) {
    return String(value).padStart(5, "0");
  }
  if (typeof value === "number") return String(value);
  return "";
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: toSearchString(search['q']),
    loc: toSearchString(search['loc']),
  }),
  head: () => ({
    meta: [
      { title: "Find a pro near you — GetPerfectBoy.com" },
      { name: "description", content: "Search local service professionals by ZIP code or city. GPB matches your job to pros who actually cover your area." },
      { property: "og:title", content: "Find a pro near you — GetPerfectBoy.com" },
      { property: "og:description", content: "Search local service professionals by ZIP code or city on GPB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const q = search.q;
  // A service phrase typed into the location field is never a place.
  const loc = search.loc && isServicePhrase(search.loc) ? "" : search.loc;
  const [serviceInput, setServiceInput] = useState(q);
  const [locationInput, setLocationInput] = useState(loc);

  useEffect(() => setServiceInput(q), [q]);
  useEffect(() => setLocationInput(loc), [loc]);

  const resolved = useResolvedLocation(loc);
  const place = resolved.kind === "zip" ? resolved.place : null;

  const intentHit = q.trim() ? matchServiceIntent(q) : null;
  const serviceMatches = q.trim() ? (rankServices(q, 6).length ? rankServices(q, 6) : searchServices(q, 6)) : [];
  const matchedCategoryName = serviceMatches[0]?.category.name;

  // High-confidence exact sub-service intent: skip the browse step entirely.
  useEffect(() => {
    if (!intentHit) return;
    rememberLocation(loc);
    void navigate({
      to: "/services/$category/$service",
      params: { category: intentHit.category.slug, service: intentHit.service.slug },
      replace: true,
    });
  }, [intentHit?.category.slug, intentHit?.service.slug, loc, navigate]);

  const { data: realProviders, isLoading: loadingProviders } = useQuery({
    queryKey: ["public-providers"],
    queryFn: fetchPublicProviders,
  });

  const { data: matched } = useQuery({
    queryKey: ["provider-matches", place?.zip ?? null, matchedCategoryName ?? null, realProviders?.length ?? 0],
    queryFn: () => matchProviders(realProviders ?? [], place, matchedCategoryName),
    enabled: Boolean(realProviders),
  });

  const serving = matched?.serving ?? [];

  const serviceLabel = intentHit?.service.name ?? serviceMatches[0]?.service.name ?? q.trim();
  const placeLabel =
    resolved.kind === "zip" || resolved.kind === "text" ? resolved.label : "";
  const heading = serviceLabel
    ? placeLabel
      ? `${serviceLabel} pros near ${placeLabel}`
      : `${serviceLabel} pros`
    : placeLabel
      ? `Find a pro near ${placeLabel}`
      : "Find a pro";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextQ = serviceInput.trim();
    const rawLoc = locationInput.trim();
    const nextLoc = isServicePhrase(rawLoc) ? "" : rawLoc;
    if (nextLoc !== rawLoc) setLocationInput("");
    rememberLocation(nextLoc);
    const hit = matchServiceIntent(nextQ);
    if (hit) {
      void navigate({
        to: "/services/$category/$service",
        params: { category: hit.category.slug, service: hit.service.slug },
      });
      return;
    }
    void navigate({ to: "/search", search: { q: nextQ, loc: nextLoc } });
  }

  return (
    <AppShell>
      <div className="pt-4">
        <h1 className="text-2xl font-black md:text-3xl">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {q.trim() ? <>Looking for “{q.trim()}”.</> : "Tell us what you need and where you are."}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-5 grid gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-sm md:grid-cols-[1.4fr_1.1fr_auto]"
      >
        <label className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-primary" />
          <input
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="What do you need? (e.g. plumber)"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <LocationAutocomplete
          value={locationInput}
          onChange={setLocationInput}
          aria-label="Location"
          placeholder="ZIP or city (e.g. 75034)"
        />
        <GradientButton type="submit" className="w-full md:w-auto">Update search</GradientButton>
      </form>

      {search.loc && !loc && (
        <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> “{search.loc}” looks like a service, not a place. Add a ZIP code or city to see pros near you.
        </p>
      )}
      {resolved.kind === "loading" && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking location…
        </p>
      )}
      {resolved.kind === "invalid-zip" && (
        <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {resolved.message}
        </p>
      )}
      {resolved.kind === "text" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing results for “{resolved.label}”. Add a 5-digit ZIP code for distance-accurate matching.
        </p>
      )}

      {serviceMatches.length > 0 && (
        <section className="mt-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matching GPB services</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {serviceMatches.map((hit, i) => (
              <Link
                key={`${hit.category.slug}/${hit.service.slug}`}
                to="/services/$category/$service"
                params={{ category: hit.category.slug, service: hit.service.slug }}
                className={
                  i === 0
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
                    : "rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                }
              >
                {hit.service.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-3xl border border-border/60 bg-card p-5 shadow-sm md:sticky md:top-20">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Browse all categories</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {catalog.map((c) => (
              <Link
                key={c.slug}
                to="/services/$category"
                params={{ category: c.slug }}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-black">Professionals on GPB</h2>
            {loadingProviders ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading providers…
              </p>
            ) : serving.length > 0 ? (
              <div className="mt-3 space-y-3">
                {serving.map((m) => <RealProviderCard key={m.provider.id} match={m} />)}
              </div>
            ) : (
              <div className="mt-3 rounded-3xl border border-dashed border-border p-6">
                <p className="text-sm font-semibold">
                  {place
                    ? `No GPB professional covers ${place.city}, ${place.state} yet.`
                    : "No GPB professional has been matched to this search yet."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We’re onboarding pros across the USA. Show us the job and we’ll notify you as coverage opens in your area.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/snap" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-md" style={{ background: "var(--gradient-primary)" }}>
                    Show us the problem <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link to="/provider-interest" className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">
                    I’m a pro — join GPB
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-black">Example profiles</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Sample listings that show how GPB profiles look. These are demo profiles — they are not local providers and are not available to book in your area.
            </p>
            <div className="mt-3 space-y-3">
              {demoProviders.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                    <Avatar initials={p.initials} gradient={p.gradient} size={56} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="truncate text-base font-bold">{p.name}</div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Demo profile</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{p.business}</div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                        </span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.availability}</span>
                        <span className="font-semibold text-primary">from ${p.startingPrice}</span>
                      </div>
                      <Link to="/provider/$id" params={{ id: p.id }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        View example profile <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function RealProviderCard({ match }: { match: ProviderMatch }) {
  const { provider, distanceMiles, place } = match;
  const initials = (provider.business_name || "GPB").slice(0, 2).toUpperCase();
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
        <Avatar initials={initials} gradient="from-[#FF3D8D] to-[#5B6CFF]" size={56} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="truncate text-base font-bold">{provider.business_name || "GPB professional"}</div>
            {provider.verification_status === "verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint/25 px-2 py-0.5 text-[10px] font-semibold text-mint-ink">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          {provider.service_category && <div className="truncate text-xs text-muted-foreground">{provider.service_category}</div>}
          {provider.bio && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{provider.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {place && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {place.city}, {place.state}
                {distanceMiles != null && <> · {distanceMiles < 1 ? "under 1" : Math.round(distanceMiles)} mi away</>}
              </span>
            )}
            {provider.availability && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {provider.availability}</span>}
            {provider.starting_price != null && <span className="font-semibold text-primary">from ${provider.starting_price}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
