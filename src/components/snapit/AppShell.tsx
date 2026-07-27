import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, CalendarDays, User, Camera, ShieldAlert } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export function AppShell({ children, hideBottomNav = false }: { children: ReactNode; hideBottomNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className={cn("mx-auto w-full max-w-6xl px-4 pt-4", hideBottomNav ? "pb-10" : "pb-28 md:pb-10")}>{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/snap" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-semibold">
            <Camera className="h-4 w-4" /> Snap AI
          </Link>
          <Link to="/emergency" className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 transition-colors font-semibold">
            <ShieldAlert className="h-4 w-4" /> Emergency
          </Link>
          <Link to="/categories" className="hover:text-foreground transition-colors">Services</Link>
          <Link to="/search" className="hover:text-foreground transition-colors">Find a Pro</Link>
          <Link to="/provider-dashboard" className="hover:text-foreground transition-colors">For Providers</Link>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
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
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gradient-primary)" }}
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
    { to: "/snap", label: "Snap AI", icon: Camera, highlight: true },
    { to: "/dashboard", label: "Bookings", icon: CalendarDays },
    { to: "/dashboard", label: "Profile", icon: User, hash: "profile" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((it, i) => {
          const active = pathname === it.to && (i === 0 ? pathname === "/" : true);
          const Icon = it.icon;
          if (it.highlight) {
            return (
              <Link
                key={i}
                to={it.to}
                className="-mt-6 flex flex-col items-center gap-1"
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-full text-white shadow-xl ring-4 ring-background"
                  style={{ background: "var(--gradient-primary)" }}
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
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
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
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
        className
      )}
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
    >
      {children}
    </button>
  );
}

export function Avatar({ initials, gradient, size = 48 }: { initials: string; gradient: string; size?: number }) {
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white font-bold shadow-md", gradient)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}