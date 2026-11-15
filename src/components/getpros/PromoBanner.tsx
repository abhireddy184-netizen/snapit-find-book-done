import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  PROMO_CTA_URL,
  PROMO_DISMISS_KEY,
  promoCountdown,
  promoLabel,
  promoVisible,
} from "@/lib/promo-banner";

/**
 * Slim seasonal offer strip shown above the header on every page until the
 * offer ends. Countdown digits render only after hydration (placeholders on the
 * server) so server and browser markup match; dismissal lasts for the session.
 */
export function PromoBanner() {
  const [now, setNow] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(PROMO_DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* storage unavailable: keep showing */
    }
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const at = now ?? Date.now();
  if (dismissed || !promoVisible(at)) return null;

  const label = promoLabel(at);
  const c = now === null ? null : promoCountdown(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: Array<[string, string]> = [
    [c ? String(c.days) : "--", "d"],
    [c ? pad(c.hours) : "--", "h"],
    [c ? pad(c.minutes) : "--", "m"],
    [c ? pad(c.seconds) : "--", "s"],
  ];

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(PROMO_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <aside
      aria-label="Founding Pros offer"
      className="relative border-b border-promo-teal/25 bg-promo text-promo-foreground"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 py-2 pl-4 pr-11 sm:pl-6 md:flex-row md:items-center md:gap-4 md:py-1.5 lg:pl-8">
        <div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="shrink-0 rounded-full border border-promo-gold/60 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-promo-gold">
              {label}
            </span>
            <p className="min-w-0 text-[13px] font-bold leading-snug sm:text-sm">
              Founding Pros Keep 100% of Their First 3 Jobs
            </p>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-promo-foreground/80 md:mt-0">
            No lead fees. Sign-up is free. Offer valid till December 31.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p className="flex items-baseline gap-1 text-promo-foreground tabular-nums" aria-label="Time left in offer">
            <span className="sr-only">Ends in </span>
            {units.map(([v, u]) => (
              <span key={u} className="inline-flex items-baseline">
                <span className="text-sm font-extrabold text-promo-teal">{v}</span>
                <span className="ml-px text-[11px] font-semibold text-promo-foreground/70">{u}</span>
              </span>
            ))}
          </p>
          <a
            href={PROMO_CTA_URL}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-promo-teal bg-promo-gold px-4 text-xs font-extrabold uppercase tracking-wide text-promo-gold-foreground shadow-sm transition-colors hover:bg-promo-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-promo-teal focus-visible:ring-offset-2 focus-visible:ring-offset-promo"
          >
            Join as a Pro
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss offer"
        className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-promo-foreground/75 transition-colors hover:bg-promo-foreground/10 hover:text-promo-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-promo-teal md:top-1/2 md:-translate-y-1/2"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
