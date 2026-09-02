import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Search, CalendarDays, User, Camera, ShieldAlert, LogOut, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children, hideBottomNav = false }: { children: ReactNode; hideBottomNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <TopBar />
      <main
        className={cn(
          "gpb-shell pt-4 md:pt-6",
          hideBottomNav ? "pb-10 md:pb-16" : "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-16"
        )}
      >
        {children}
      </main>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55",
        scrolled
          ? "border-border/60 bg-background/80 shadow-[0_4px_24px_-12px_color-mix(in oklab, var(--plum) 16%, transparent)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.55)]"
          : "border-transparent bg-background/60"
      )}
    >
      <div className="gpb-shell grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:h-16 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-6">
        <div className="min-w-0">
          <Logo />
        </div>
        <nav className="hidden items-center justify-center gap-1 text-sm font-medium text-muted-foreground lg:flex xl:gap-2 [&>a]:whitespace-nowrap">
          {/* One emphasis per row: Sign up is the only filled CTA. Secondary
              destinations (How it works, For Pros, Early Access) live in the
              footer so the header stays calm. */}
          <Link
            to="/snap"
            onClick={(e) => {
              // Already on Show GP with a photo/result open: reset in place
              // and reopen the camera instead of a no-op same-route navigation.
              if (pathname === "/snap") {
                e.preventDefault();
                window.dispatchEvent(new Event("getpros:recapture"));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors"
          >
            <Camera className="h-4 w-4" /> Show GP
          </Link>
          <Link to="/services" className="rounded-full px-3 py-1.5 hover:text-foreground hover:bg-muted transition-colors">Services</Link>
          <Link to="/emergency" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-destructive hover:bg-destructive/10 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Emergency
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 justify-self-end sm:gap-2">
          <ThemeToggle />
          <AuthNav />
        </div>
      </div>
    </header>
  );
}

function AuthNav() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />;

  if (user) {
    const dashboardTo = profile?.role === "provider" ? "/provider-dashboard" : "/dashboard";
    const initials = (profile?.full_name || user.email || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <>
        <Link
          to={dashboardTo}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: "var(--primary)" }}>
            {initials}
          </span>
          <span className="hidden md:inline">
            <LayoutDashboard className="mr-1 inline h-3.5 w-3.5" /> Dashboard
          </span>
        </Link>
        <button
          onClick={() => void signOut()}
          aria-label="Log out"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Log out</span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Returning users need a visible way in on phones too — a plain text
          link keeps the header inside 320px next to the gradient Sign up CTA. */}
      <Link
        to="/login"
        search={{ redirect: undefined }}
        className="inline-flex shrink-0 items-center rounded-full px-2.5 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:px-4"
      >
        Log in
      </Link>
      <Link
        to="/register"
        search={{ redirect: undefined, role: undefined }}
        className="inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-card transition-all hover:scale-[1.01] hover:shadow-elevated sm:px-4"
        style={{ background: "var(--gradient-primary)", boxShadow: "0 10px 24px -12px color-mix(in oklab, var(--primary) 55%, transparent)" }}
      >
        Sign up
      </Link>
    </>
  );
}

/**
 * True while a text field has focus — used to drop the floating bottom nav so
 * the on-screen keyboard never covers the composer's actions on mobile.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const isField = (el: Element | null) =>
      !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
    const onFocus = (e: FocusEvent) => { if (isField(e.target as Element)) setOpen(true); };
    const onBlur = () => setOpen(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);
  return open;
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const keyboardOpen = useKeyboardOpen();
  const { user } = useAuth();
  const items: Array<{
    key: string;
    to: "/" | "/search" | "/snap" | "/dashboard" | "/login";
    label: string;
    icon: typeof Home;
    highlight?: boolean;
  }> = [
    { key: "home", to: "/", label: "Home", icon: Home },
    { key: "search", to: "/search", label: "Search", icon: Search },
    { key: "snap", to: "/snap", label: "Show GP", icon: Camera, highlight: true },
    { key: "bookings", to: "/dashboard", label: "Bookings", icon: CalendarDays },
    // Signed-out visitors get a real entry point instead of a silent redirect.
    user
      ? { key: "profile", to: "/dashboard", label: "Profile", icon: User }
      : { key: "profile", to: "/login", label: "Log in", icon: User },
  ];
  return (
    <nav
      aria-hidden={keyboardOpen}
      className={cn(
        "fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-4 transition-all duration-200 md:hidden",
        keyboardOpen && "pointer-events-none translate-y-[140%] opacity-0"
      )}
    >
      <div className="glass-strong mx-auto flex items-stretch justify-around rounded-full px-2 py-2 shadow-[0_20px_60px_-20px_color-mix(in oklab, var(--plum) 22%, transparent)]">
        {items.map((it) => {
          const active = it.key === "home" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          const search =
            it.to === "/search"
              ? { q: "", loc: "" }
              : it.to === "/login"
                ? { redirect: undefined }
                : undefined;
          if (it.highlight) {
            return (
              <Link
                key={it.key}
                to={it.to}
                onClick={(e) => {
                  // Already on the Show GP screen with a photo/result open:
                  // clear that state and reopen the camera in place instead
                  // of a no-op navigation to the current route.
                  if (pathname === "/snap") {
                    e.preventDefault();
                    window.dispatchEvent(new Event("getpros:recapture"));
                  }
                }}
                className="-mt-7 flex flex-col items-center gap-1.5"
                aria-label="Show GP — camera diagnosis"
              >
                <span
                  className="grid h-14 w-14 place-items-center rounded-full text-white shadow-elevated ring-[3px] ring-card transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--gradient-primary)", boxShadow: "0 16px 40px -12px color-mix(in oklab, var(--primary) 60%, transparent)" }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-bold text-foreground">{it.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={it.key}
              to={it.to}
              {...(search ? { search } : {})}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{it.label}</span>
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
      ? "0 16px 40px -12px color-mix(in oklab, var(--mint) 60%, transparent)"
      : variant === "accent"
      ? "0 16px 40px -12px color-mix(in oklab, var(--secondary) 65%, transparent)"
      : "0 16px 40px -12px color-mix(in oklab, var(--primary) 55%, transparent)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-all hover:scale-[1.01] hover:shadow-elevated active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
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
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white font-bold shadow-card ring-2 ring-white", gradient)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}