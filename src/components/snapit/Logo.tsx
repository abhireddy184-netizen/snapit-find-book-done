import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div
        className="relative grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/40"
        style={{ background: "var(--gradient-primary)", boxShadow: "0 10px 30px -10px rgba(37,99,235,0.55)" }}
      >
        <Zap className="h-5 w-5" strokeWidth={2.5} fill="currentColor" />
        <span className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/40 to-transparent opacity-70" />
      </div>
      {!compact && (
        <span className="text-xl font-black tracking-tight text-foreground">
          Snap<span className="text-gradient-primary">It</span>
        </span>
      )}
    </Link>
  );
}