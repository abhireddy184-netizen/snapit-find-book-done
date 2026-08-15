import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function Logo({ compact = false, onColor = false }: { compact?: boolean; onColor?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div
        className={`relative grid h-10 w-10 place-items-center rounded-2xl shadow-lg ring-1 ring-white/40 ${onColor ? "text-primary" : "text-white"}`}
        style={
          onColor
            ? { background: "var(--card)", boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.25)" }
            : { background: "var(--gradient-primary)", boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--primary) 55%, transparent)" }
        }
      >
        <Zap className="h-5 w-5" strokeWidth={2.5} fill="currentColor" />
        {!onColor && <span className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/40 to-transparent opacity-70" />}
      </div>
      {!compact && (
        <span className={`text-xl font-black tracking-tight ${onColor ? "text-white" : "text-foreground"}`}>
          Snap<span className={onColor ? "text-secondary" : "text-gradient-primary"}>It</span>
        </span>
      )}
    </Link>
  );
}