import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, CalendarDays, User, Camera, ShieldAlert, History } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function AppShell({ children, hideBottomNav = false }: { children: ReactNode; hideBottomNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <TopBar />
      <main className={cn("mx-auto w-full max-w-6xl px-4 pt-4", hideBottomNav ? "pb-10" : "pb-28 md:pb-10")}>{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/snap" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-primary hover:bg-primary/5 transition-colors">
            <Camera className="h-4 w-4" /> Snap
          </Link>
          <Link to="/emergency" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/10 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Emergency
          </Link>
          <Link to="/history" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">
            <History className="h-4 w-4" /> History
          </Link>
          <Link to="/categories" className="rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">Services</Link>
          <Link to="/search" className="rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">Find a Pro</Link>
          <Link to="/provider-dashboard" className="rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">For Providers</Link>
          <Link to="/dashboard" className="rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-foreground hover:bg-muted md:inline-flex"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 10px 24px -12px rgba(37,99,235,0.55)" }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/search", label: "Search", icon: Search },
    { to: "/snap", label: "Snap", icon: Camera, highlight: true },
    { to: "/history", label: "History", icon: History },
    { to: "/dashboard", label: "Profile", icon: User, hash: "profile" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto max-w-md px-4 md:hidden">
      <div className="glass-strong mx-auto flex items-stretch justify-around rounded-full px-2 py-2 shadow-[0_20px_60px_-20px_rgba(17,24,39,0.25)]">
        {items.map((it, i) => {
          const active = pathname === it.to && (i === 0 ? pathname === "/" : true);
          const Icon = it.icon;
          if (it.highlight) {
            return (
              <Link
                key={i}
                to={it.to}
                className="-mt-7 flex flex-col items-center gap-1"
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-full text-white shadow-xl ring-4 ring-white transition-transform hover:scale-105"
                  style={{ background: "var(--gradient-primary)", boxShadow: "0 16px 40px -12px rgba(37,99,235,0.6)" }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-bold text-primary">{it.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={i}
              to={it.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function GradientButton({
  children,
  onClick,
  className,
  type = "button",
  disabled = false,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "accent";
}) {
  const bg =
    variant === "secondary"
      ? "var(--gradient-secondary)"
      : variant === "accent"
      ? "var(--gradient-accent)"
      : "var(--gradient-primary)";
  const glow =
    variant === "secondary"
      ? "0 16px 40px -12px rgba(16,185,129,0.5)"
      : variant === "accent"
      ? "0 16px 40px -12px rgba(249,115,22,0.55)"
      : "0 16px 40px -12px rgba(37,99,235,0.55)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
        className
      )}
      style={{ background: bg, boxShadow: glow }}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-70" />
      <span className="relative inline-flex items-center gap-2">
      {children}
      </span>
    </button>
  );
}

export function Avatar({ initials, gradient, size = 48 }: { initials: string; gradient: string; size?: number }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white font-bold shadow-md ring-2 ring-white", gradient)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}