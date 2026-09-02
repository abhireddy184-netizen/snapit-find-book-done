import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/snapit/AppShell";
import { Camera, Trash2, Sparkles, Clock, DollarSign, ArrowRight } from "lucide-react";
import { loadHistory, removeHistoryEntry, clearHistory, formatRelative, type SnapHistoryEntry } from "@/lib/snap-history";
import { categories } from "@/lib/snapit-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Diagnosis history — GetPros" },
      { name: "description", content: "Every GetPros AI diagnosis you've saved, with cost estimates, urgency and matched pros." },
      { property: "og:title", content: "Your GetPros diagnosis history" },
      { property: "og:description", content: "Revisit past AI diagnoses and rebook the pros you loved." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [entries, setEntries] = useState<SnapHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    setReady(true);
  }, []);

  const remove = (id: string) => {
    removeHistoryEntry(id);
    setEntries((e) => e.filter((x) => x.id !== id));
  };

  const wipe = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all diagnosis history?")) return;
    clearHistory();
    setEntries([]);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pt-2 animate-fade-in">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Diagnosis History
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Your AI diagnoses</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every problem you've snapped, saved on this device.</p>
          </div>
          {entries.length > 0 && (
            <button onClick={wipe} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          )}
        </div>

        {ready && entries.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/60 p-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-elevated" style={{ background: "var(--primary)" }}>
              <Camera className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold">No diagnoses yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Snap a photo of a problem and your AI diagnosis will be saved here for future reference.
            </p>
            <Link
              to="/snap"
              className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-card"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Camera className="h-4 w-4" /> Snap a problem
            </Link>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-6 grid gap-3">
            {entries.map((entry) => {
              const cat = categories.find((c) => c.slug === entry.analysis.categorySlug);
              return (
                <div
                  key={entry.id}
                  className="group flex gap-3 overflow-hidden surface-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <img src={entry.thumbnail} alt="Diagnosis" className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {cat && (
                        <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br ${cat.color} px-2 py-0.5 text-xs font-semibold text-white`}>
                          <cat.icon className="h-3 w-3" /> {entry.analysis.category}
                        </span>
                      )}
                      <span className="text-xs font-medium text-muted-foreground">{formatRelative(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground">{entry.analysis.problem}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                        <DollarSign className="h-3 w-3" />{" "}
                        {entry.analysis.hasPriceEstimate
                          ? `$${entry.analysis.estimatedCostLow}–$${entry.analysis.estimatedCostHigh}`
                          : "Needs more info"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {entry.analysis.estimatedDurationMinutes} min
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 font-semibold uppercase text-xs tracking-wider">
                        {entry.analysis.urgency}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to="/search"
                        search={{ q: "", loc: "" }}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        Find pros <ArrowRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => remove(entry.id)}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Delete diagnosis"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}