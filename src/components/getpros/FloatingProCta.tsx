import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Pages where a floating "Join as a Pro" would be redundant or cover a form/camera/checkout. */
const HIDDEN_PREFIXES = [
  "/register", "/login", "/provider-interest", "/provider-setup", "/provider-dashboard",
  "/reset-password", "/auth", "/snap", "/book", "/plan", "/admin", "/dashboard", "/job", "/tracking",
];

/**
 * Mobile-only floating Pro recruitment pill. Renders nothing on the server and
 * until mounted, so there is no hydration mismatch; it is fixed-position, so no
 * layout shift. Sits above the bottom nav on the left, clear of the chat button.
 */
export function FloatingProCta({ keyboardOpen }: { keyboardOpen: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hide while the in-page Join as a Pro button is already on screen.
  useEffect(() => {
    if (!mounted) return;
    setHeroVisible(false);
    const el = document.getElementById("hero-provider-interest-cta");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(!!e?.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, pathname]);

  const hidden =
    !mounted || loading || !!user || keyboardOpen || heroVisible ||
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}.`));
  if (!mounted || loading || user || HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div
      className={cn(
        "fixed left-4 z-40 transition-all duration-200 md:hidden bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.75rem)]",
        hidden && "pointer-events-none translate-y-3 opacity-0"
      )}
      aria-hidden={hidden || undefined}
    >
      <Link
        to="/register"
        search={{ redirect: undefined, role: "provider" }}
        tabIndex={hidden ? -1 : undefined}
        data-analytics-id="provider_signup_cta"
        data-analytics-location="mobile_floating"
        className="gp-pro-float inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        Join as a Pro
        <Sparkles className="gp-sparkle-dot right-2 top-1 h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}
