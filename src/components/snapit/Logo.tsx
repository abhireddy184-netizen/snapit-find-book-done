import { Link } from "@tanstack/react-router";

/**
 * GetPros.ai typographic wordmark — pure text/CSS, no image dependency.
 * "Get" navy · "Pros" teal · ".ai" slate. Crisp at every size.
 */
export function Wordmark({
  size = 22,
  /** Kept for API compatibility; the wordmark is always the brand palette. */
  gradient = true,
  className = "",
  /** Drop ".ai" in very tight spots (compact nav, small buttons). */
  short = false,
  onColor = false,
}: {
  size?: number | string;
  gradient?: boolean;
  className?: string;
  short?: boolean;
  onColor?: boolean;
}) {
  void gradient;
  return (
    <span
      aria-hidden="true"
      className={`brand-font whitespace-nowrap font-extrabold leading-none tracking-[-0.03em] ${className}`}
      style={{ fontSize: size }}
    >
      <span className={onColor ? "text-white" : "text-brand-navy"}>Get</span>
      <span className={onColor ? "text-white/85" : "text-brand-teal"}>Pros</span>
      {!short && (
        <span className={onColor ? "text-white/70" : "text-brand-slate"} style={{ fontWeight: 700 }}>
          .ai
        </span>
      )}
    </span>
  );
}

/**
 * Compact monogram tile for favicons, avatars and in-app section badges.
 * "GPA" where there is room, an abstract "GP" lockup at tiny sizes.
 */
export function BrandMark({
  size = 36,
  className = "",
  onColor = false,
}: {
  size?: number;
  className?: string;
  onColor?: boolean;
}) {
  const initials = size >= 28 ? "GPA" : "GP";
  return (
    <span
      className={`brand-font relative grid shrink-0 place-items-center overflow-hidden rounded-[13px] font-extrabold ${className}`}
      style={{
        width: size,
        height: size,
        background: onColor ? "var(--card)" : "var(--brand-navy)",
        fontSize: Math.round(size * (initials.length === 3 ? 0.34 : 0.42)),
        letterSpacing: "-0.03em",
      }}
    >
      <span style={{ color: onColor ? "var(--brand-navy)" : "#fff" }}>
        {initials.slice(0, initials.length - 1)}
        <span style={{ color: "var(--brand-teal)" }}>{initials.slice(-1)}</span>
      </span>
    </span>
  );
}

export function Logo({ compact = false, onColor = false }: { compact?: boolean; onColor?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="GetPros.ai home">
      <BrandMark size={36} onColor={onColor} className="h-9 w-9 sm:h-10 sm:w-10" />
      {!compact && (
        /* Below 360px the monogram alone carries the brand so the header
           never overflows next to Log in / Sign up. */
        <span className="hidden min-w-0 leading-none min-[360px]:block">
          <span className="block">
            {/* ".ai" only where there is room, so narrow phones show a clean
                "GetPros" instead of a clipped wordmark. */}
            <Wordmark size="clamp(1rem, 4.4vw, 1.2rem)" onColor={onColor} className="inline-block" />
          </span>
          <span className={`mt-1 hidden truncate text-[10px] font-medium sm:block ${onColor ? "text-white/80" : "text-muted-foreground"}`}>
            Whatever you need. Consider it done.
          </span>
        </span>
      )}
    </Link>
  );
}
