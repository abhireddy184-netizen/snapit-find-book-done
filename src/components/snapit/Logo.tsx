import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div
        className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-md"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Zap className="h-5 w-5" strokeWidth={2.5} fill="currentColor" />
      </div>
      {!compact && (
        <span className="text-xl font-black tracking-tight text-foreground">
          Snap<span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>It</span>
        </span>
      )}
    </Link>
  );
}