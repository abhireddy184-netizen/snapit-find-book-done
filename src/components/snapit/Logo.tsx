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
 * The GP monogram artwork (128x84, transparent PNG). Aspect ratio preserved:
 * callers set the height and the width follows.
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
  void onColor;
  return (
    <img
      src="/brand/getpros-gp.png"
      alt="GetPros"
      width={Math.round(size * (128 / 84))}
      height={size}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ height: size, width: "auto" }}
      decoding="async"
    />
  );
}

export function Logo({
  compact = false,
  onColor = false,
  /** The tagline belongs in the footer; the header lockup stays a single line. */
  showTagline = false,
}: {
  compact?: boolean;
  onColor?: boolean;
  showTagline?: boolean;
}) {
  return (
    <Link to="/" className="flex min-w-0 items-center" aria-label="GetPros.ai home">
      <Wordmark size={compact ? 19 : 22} onColor={onColor} className="sm:text-[24px]" />
      {showTagline && (
        <span
          className={`ml-3 hidden truncate text-xs font-medium sm:block ${onColor ? "text-white/80" : "text-muted-foreground"}`}
        >
          Smart service matching, powered by AI.
        </span>
      )}
    </Link>
  );
}


