import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { GpaMark } from "@/components/getpros/GpaMark";
import proPortrait from "@/assets/promo-pro-portrait.jpg";
import {
  PROMO_CTA_URL,
  PROMO_DISMISS_KEY,
  promoCountdown,
  promoLabel,
  promoVisible,
} from "@/lib/promo-banner";

type Countdown = ReturnType<typeof promoCountdown>;

/**
 * Seasonal Founding Pros offer, rendered once above every route.
 * Homepage gets the full cinematic layout; every other page gets a compact strip
 * in the same style. The countdown is computed on the server too (real numbers,
 * never placeholders) and corrected on the first client tick.
 */
export function PromoBanner() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(PROMO_DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* storage unavailable: keep showing */
    }
    setHydrated(true);
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (dismissed || !promoVisible(now)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(PROMO_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const props = { label: promoLabel(now), countdown: promoCountdown(now), hydrated, onDismiss: dismiss };
  return pathname === "/" ? <CinematicBanner {...props} /> : <CompactBanner {...props} />;
}

type BannerProps = {
  label: string;
  countdown: Countdown;
  hydrated: boolean;
  onDismiss: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

function units(c: Countdown): Array<[string, string, string]> {
  return [
    [String(c.days), "Days", "d"],
    [pad(c.hours), "Hrs", "h"],
    [pad(c.minutes), "Min", "m"],
    [pad(c.seconds), "Sec", "s"],
  ];
}

function DismissButton({ onDismiss, className = "" }: { onDismiss: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss offer"
      className={`absolute z-20 inline-flex h-10 w-10 items-center justify-center rounded-full text-promo-foreground/75 transition-colors hover:bg-promo-foreground/10 hover:text-promo-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-promo-teal ${className}`}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function CinematicBanner({ label, countdown, hydrated, onDismiss }: BannerProps) {
  return (
    <aside
      aria-label="Founding Pros offer"
      className="promo-cine relative overflow-hidden border-b border-promo-teal/20 text-promo-foreground"
    >
      {/* Ambient layers */}
      <div aria-hidden className="promo-cine-grid pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="promo-cine-beam pointer-events-none absolute -left-1/4 -top-1/2 -z-10 h-[200%] w-[90%]" />
      <div aria-hidden className="promo-hairline pointer-events-none absolute inset-x-0 top-0 h-px" />

      <div className="relative mx-auto grid max-w-7xl md:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="relative z-10 px-4 pb-6 pt-5 sm:px-6 md:pb-10 md:pt-9 lg:px-8 lg:pb-12 lg:pt-11">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-10 md:pr-0">
            <span className="rounded-full border border-promo-lime/60 bg-promo-lime/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-promo-lime sm:text-[11px]">
              {label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-promo-teal sm:text-xs">
              Founding Pros Special
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 md:mt-5">
            <p className="min-w-0">
              <span className="promo-chrome block brand-font text-[clamp(1.6rem,8vw,2.25rem)] font-extrabold uppercase leading-none tracking-tight md:text-5xl lg:text-6xl">
                Keep
              </span>
              <span className="promo-100 mt-1 text-[clamp(3.6rem,17vw,5.75rem)] md:mt-2 md:text-[7.5rem] lg:text-[9.5rem]">
                <span aria-hidden className="promo-100-depth">100%</span>
                <span className="promo-100-face">100%</span>
              </span>
              <span className="mt-2 block brand-font text-[clamp(0.95rem,4.6vw,1.25rem)] font-extrabold uppercase leading-tight tracking-[0.04em] text-promo-foreground md:mt-3 md:text-2xl lg:text-3xl">
                of your first 3 jobs
              </span>
            </p>
            {/* Phone/tablet portrait: framed, never cropped by text */}
            <div className="relative w-[34%] max-w-[168px] shrink-0 md:hidden">
              <div aria-hidden className="promo-photo-rim absolute -inset-3 rounded-[1.75rem]" />
              <img
                src={proPortrait}
                alt="A GetPros home-service professional"
                width={1024}
                height={1152}
                decoding="async"
                className="relative aspect-[4/5] w-full rounded-2xl border border-promo-teal/30 object-cover object-top shadow-2xl"
              />
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-promo-foreground/90 sm:text-base md:mt-6 md:text-lg">
            No Lead Fees. Free Sign-Up. More Opportunities.
          </p>
          <p className="mt-1 text-xs text-promo-foreground/60 sm:text-sm">Offer valid through December 31, 2026.</p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5 md:mt-7 md:flex-col md:items-start lg:flex-row lg:items-center">
            <div role="timer" aria-label="Time left in offer" className="grid grid-cols-4 gap-2 sm:flex">
              <span className="sr-only">Offer ends in {countdown.days} days</span>
              {units(countdown).map(([v, l]) => (
                <span
                  key={l}
                  aria-hidden
                  className="promo-tile flex min-w-0 flex-col items-center rounded-xl px-2 py-2 sm:w-[4.25rem] lg:w-[4.75rem] lg:py-2.5"
                >
                  <span
                    key={hydrated ? v : "ssr"}
                    suppressHydrationWarning
                    className={`brand-font text-xl font-extrabold tabular-nums leading-none text-promo-foreground lg:text-2xl ${hydrated ? "promo-tick" : ""}`}
                  >
                    {v}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-promo-teal">{l}</span>
                </span>
              ))}
            </div>
            <a
              href={PROMO_CTA_URL}
              className="promo-cta inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-sm font-extrabold uppercase tracking-[0.12em] sm:min-h-[3.25rem]"
            >
              Join as a Pro <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>

        {/* Desktop/laptop: cinematic portrait on the right */}
        <div className="relative hidden md:block">
          <div aria-hidden className="promo-photo-rim absolute inset-0" />
          <img
            src={proPortrait}
            alt="A GetPros home-service professional"
            width={1024}
            height={1152}
            decoding="async"
            className="promo-photo absolute inset-0 h-full w-full object-cover object-[60%_18%]"
          />
          <div className="promo-tile absolute bottom-6 left-10 flex items-center gap-3 rounded-2xl px-4 py-3 lg:bottom-8 lg:left-14">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-promo/80 p-1.5">
              <GpaMark className="h-auto w-full" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-promo-foreground">GetPros.ai</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-promo-teal">Founding Pros</span>
            </span>
          </div>
        </div>
      </div>

      <DismissButton onDismiss={onDismiss} className="right-2 top-2 bg-promo-ink/40 backdrop-blur-sm md:right-3 md:top-3" />
    </aside>
  );
}

function CompactBanner({ label, countdown, hydrated, onDismiss }: BannerProps) {
  return (
    <aside
      aria-label="Founding Pros offer"
      className="promo-cine relative overflow-hidden border-b border-promo-teal/20 text-promo-foreground"
    >
      <div aria-hidden className="promo-hairline pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="mx-auto flex max-w-7xl flex-col gap-2 py-2 pl-4 pr-11 sm:pl-6 md:flex-row md:items-center md:gap-4 md:py-1.5 lg:pl-8">
        <div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="shrink-0 rounded-full border border-promo-lime/60 bg-promo-lime/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-promo-lime">
              {label}
            </span>
            <p className="min-w-0 text-[13px] font-bold leading-snug sm:text-sm">
              Founding Pros keep <span className="text-promo-lime">100%</span> of their first 3 jobs
            </p>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-promo-foreground/70 md:mt-0">
            No lead fees. Free sign-up. Ends Dec 31, 2026.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p role="timer" aria-label="Time left in offer" className="flex items-center gap-1 tabular-nums">
            <span className="sr-only">Offer ends in {countdown.days} days</span>
            {units(countdown).map(([v, , u]) => (
              <span key={u} aria-hidden className="promo-tile inline-flex items-baseline rounded-md px-1.5 py-0.5">
                <span
                  key={hydrated ? v : "ssr"}
                  suppressHydrationWarning
                  className={`text-xs font-extrabold text-promo-foreground ${hydrated ? "promo-tick" : ""}`}
                >
                  {v}
                </span>
                <span className="ml-px text-[10px] font-semibold text-promo-teal">{u}</span>
              </span>
            ))}
          </p>
          <a
            href={PROMO_CTA_URL}
            className="promo-cta inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-extrabold uppercase tracking-wide"
          >
            Join as a Pro <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <DismissButton onDismiss={onDismiss} className="right-1 top-1 md:top-1/2 md:-translate-y-1/2" />
    </aside>
  );
}
