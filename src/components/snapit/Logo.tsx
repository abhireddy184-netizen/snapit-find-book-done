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
  size?: number | string;
  gradient?: boolean;
  className?: string;
}) {
  const g = gradient ? "text-gradient-hero" : "";
  return (
    <span
      aria-hidden="true"
      className={`inline-block font-black leading-none tracking-[-0.045em] ${className}`}
      style={{ fontSize: size, paddingBottom: "0.14em" }}
    >
      <span className={g}>G</span>
      <span className={`relative inline-block ${g}`} style={{ top: "0.12em" }}>P</span>
      <span className={g}>B</span>
    </span>
  );
}

/**
 * The GPB app-icon tile (gradient rounded square + dropped-P wordmark),
 * without the link/home behaviour. Use to badge in-app sections.
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
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[13px] pb-0.5 shadow-md ${className}`}
      style={{
        width: size,
        height: size,
        ...(onColor
          ? { background: "var(--card)" }
          : {
              background: "var(--gradient-hero)",
              boxShadow: "0 10px 26px -14px color-mix(in oklab, var(--secondary) 70%, transparent)",
            }),
      }}
    >
      <Wordmark size={Math.round(size * 0.36)} gradient={false} className={onColor ? "text-primary" : "text-white"} />
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
        /* Below 360px the wordmark tile alone carries the brand so the header
           never overflows next to Log in / Sign up. */
        <span className="hidden min-w-0 leading-none min-[360px]:block">
          <span className={`block truncate text-[14px] font-black tracking-tight sm:text-base ${onColor ? "text-white" : "text-foreground"}`}>
            GetPerfectBoy.com
          </span>
          <span className={`mt-1 hidden truncate text-[10px] font-medium sm:block ${onColor ? "text-white/80" : "text-muted-foreground"}`}>
            Whatever you need. Consider it done.
          </span>
        </span>
      )}
    </Link>
  );
}
