import { Link } from "@tanstack/react-router";

/**
 * GPB wordmark. G and B stay on the baseline; the P drops ~12% below it.
 * Pure text/CSS treatment so it stays crisp at every size.
 */
export function Wordmark({
  size = 22,
  gradient = true,
  className = "",
}: {
  size?: number;
  gradient?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-baseline font-black leading-none tracking-[-0.045em] ${gradient ? "text-gradient-hero" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      <span>G</span>
      <span style={{ display: "inline-block", transform: `translateY(${Math.round(size * 0.12)}px)` }}>P</span>
      <span>B</span>
    </span>
  );
}

export function Logo({ compact = false, onColor = false }: { compact?: boolean; onColor?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="GPB — GetPerfectBoy.com home">
      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[13px] pb-0.5 shadow-md sm:h-10 sm:w-10"
        style={
          onColor
            ? { background: "var(--card)" }
            : { background: "var(--gradient-hero)", boxShadow: "0 10px 26px -14px color-mix(in oklab, var(--secondary) 70%, transparent)" }
        }
      >
        <Wordmark size={13} gradient={false} className={onColor ? "text-primary" : "text-white"} />
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className={`block truncate text-[14px] font-black tracking-tight sm:text-base ${onColor ? "text-white" : "text-foreground"}`}>
            GetPerfectBoy.com
          </span>
          <span className={`mt-1 hidden truncate text-[10px] font-medium sm:block ${onColor ? "text-white/80" : "text-muted-foreground"}`}>
            Show it. We'll handle the rest.
          </span>
        </span>
      )}
    </Link>
  );
}
