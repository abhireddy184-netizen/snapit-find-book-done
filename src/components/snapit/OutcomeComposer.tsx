import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";

const EXAMPLES = [
  "My parents are visiting tomorrow. Get my apartment ready.",
  "My car is making a strange noise. Handle it.",
  "I'm moving Saturday. Help me get everything done.",
  "The kitchen sink is leaking under the cabinet.",
  "Guests at 6pm — deep clean the living room and bath.",
];

/**
 * Outcome-first hero composer. The request text is routed into the existing
 * /search intent pipeline so nothing new is promised on the backend.
 */
export function OutcomeComposer() {
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [loc, setLoc] = useState("");
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % EXAMPLES.length);
    }, 3800);
    return () => window.clearInterval(t);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = request.trim();
    void navigate({ to: "/search", search: { q, loc: loc.trim() } });
  };

  return (
    <form
      onSubmit={submit}
      data-analytics-id="outcome_composer"
      className="rounded-[26px] border border-border/60 bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4"
    >
      <label htmlFor="gpb-outcome" className="sr-only">
        Describe what you need done
      </label>
      <div className="relative">
        <textarea
          id="gpb-outcome"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}
          rows={3}
          placeholder={EXAMPLES[i]}
          className="min-h-[92px] w-full resize-none rounded-2xl bg-muted/40 px-4 py-3.5 pr-12 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted/60"
        />
        <button
          type="button"
          aria-label="Voice input — coming soon"
          title="Voice input is coming soon"
          disabled
          className="absolute right-2.5 top-2.5 grid h-9 w-9 cursor-not-allowed place-items-center rounded-full border border-border/70 bg-background text-muted-foreground opacity-70"
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        Example request: {EXAMPLES[i]}
      </p>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <LocationAutocomplete
            value={loc}
            onChange={setLoc}
            aria-label="ZIP or city"
            placeholder="ZIP or city"
            fieldClassName="rounded-2xl bg-muted/40 px-4 py-3"
          />
        </div>
        <button
          type="submit"
          data-analytics-id="outcome_submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.01] sm:w-auto"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-4 w-4" /> Let GPB handle it
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-3">
        <Link
          to="/snap"
          data-analytics-id="show_gpb_cta"
          data-analytics-location="hero_composer"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Camera className="h-4 w-4 text-primary" /> Show GPB instead
        </Link>
        <span className="text-[11px] text-muted-foreground">
          Don’t know the service name? Just say the outcome.
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {EXAMPLES.slice(0, 3).map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setRequest(ex)}
            className="shrink-0 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
          </button>
        ))}
      </div>
    </form>
  );
}

export default OutcomeComposer;
