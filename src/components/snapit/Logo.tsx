import { Link } from "@tanstack/react-router";

export function Logo({ compact = false, onColor = false }: { compact?: boolean; onColor?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="GPB — GetPerfectBoy.com home">
      <span
        className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-[14px] text-[13px] font-black tracking-tight shadow-lg ring-1 ring-white/30 ${
          onColor ? "text-primary" : "text-white"
        }`}
        style={
          onColor
            ? { background: "var(--card)", boxShadow: "0 10px 30px -12px oklch(0 0 0 / 0.3)" }
            : { background: "var(--gradient-hero)", boxShadow: "0 12px 30px -12px color-mix(in oklab, var(--secondary) 65%, transparent)" }
        }
      >
        <span className="relative">GPB</span>
        {!onColor && <span className="pointer-events-none absolute -inset-px bg-gradient-to-b from-white/35 to-transparent opacity-70" />}
      </span>
      {!compact && (
        <span className="leading-none">
          <span className={`block text-xl font-black tracking-tight ${onColor ? "text-white" : "text-foreground"}`}>GPB</span>
          <span className={`block text-[10px] font-semibold tracking-wide ${onColor ? "text-white/80" : "text-muted-foreground"}`}>
            GetPerfectBoy.com
          </span>
        </span>
      )}
    </Link>
  );
}
