import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToUpdates } from "@/lib/subscribe.functions";
import { Logo } from "./Logo";

export function Footer() {
  const [email, setEmail] = useState("");
  const subscribe = useServerFn(subscribeToUpdates);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "already" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setState("submitting");
    setMessage("");
    try {
      const res = await subscribe({ data: { email: value, source: "website_footer" } });
      if (res.status === "already_subscribed") {
        setState("already");
        setMessage("You're already subscribed — thanks for being with GetPros.");
      } else {
        setState("success");
        setMessage(
          res.emailDelivery === "sent"
            ? "You're subscribed. Check your inbox for a welcome note."
            : "You're subscribed. We couldn't send the welcome email right now, but you're on the list.",
        );
        setEmail("");
      }
    } catch {
      setState("error");
      setMessage("We couldn't save your subscription. Please try again.");
    }
  };

  return (
    <footer className="mt-12 border-t border-border/60 pt-10 pb-6 text-sm text-muted-foreground">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="min-w-0">
          <Link to="/" aria-label="GetPros.ai home" className="inline-flex">
            <Logo showTagline />
          </Link>
          <p className="mt-3 max-w-xs text-xs leading-relaxed">
            Type, say, or show what you need. We find the right local pro.
          </p>
        </div>

        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Get started</div>
          <ul className="space-y-2">
            <li>
              <a
                href="/#early-access"
                id="footer-early-access-link"
                data-analytics-id="early_access_cta"
                data-analytics-location="footer"
                className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline sm:min-h-0"
              >
                Early Access
              </a>
            </li>
            <li>
              <Link
                to="/register"
                search={{ redirect: undefined, role: "provider" }}
                id="footer-for-pros-link"
                data-analytics-id="provider_signup_cta"
                data-analytics-location="footer"
                className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0"
              >
                For Pros
              </Link>
            </li>
            <li><Link to="/snap" data-analytics-id="show_gpb_cta" data-analytics-location="footer" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Show GP</Link></li>
            <li><Link to="/services" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">All services</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Company</div>
          <ul className="space-y-2">
            <li><a href="/#how-it-works" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">How it works</a></li>
            <li><Link to="/emergency" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Emergency services</Link></li>
            <li><Link to="/trust-safety" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Trust &amp; safety</Link></li>
          </ul>
        </div>

        <div className="min-w-0">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Newsletter</div>
          <p className="mb-3 text-xs leading-relaxed">
            GetPros news and new services.{" "}
            <a href="/#early-access" className="font-semibold text-primary hover:underline">Join early access</a> for launch alerts.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="flex min-w-0 overflow-hidden rounded-full border border-border/60 bg-card p-1 shadow-sm"
          >
            <label htmlFor="gpb-newsletter-email" className="sr-only">Email address for GetPros updates</label>
            <input
              id="gpb-newsletter-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (state !== "idle") { setState("idle"); setMessage(""); } }}
              autoComplete="email"
              aria-invalid={state === "error"}
              aria-describedby="gpb-newsletter-status"
              placeholder="you@email.com"
              className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={state === "submitting"}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-70"
              style={{ background: "var(--gradient-primary)" }}
            >
              {state === "submitting" ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
          <p
            id="gpb-newsletter-status"
            role="status"
            aria-live="polite"
            className={`mt-2 min-h-[1rem] text-xs font-semibold ${state === "error" ? "text-destructive" : "text-foreground"}`}
          >
            {message}
          </p>
        </div>
      </div>
      <div className="mt-8">
      </div>
      <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs md:flex-row md:items-center">
        <span>© {new Date().getFullYear()} GetPros.ai. All rights reserved.</span>
        <div className="flex flex-wrap gap-5">
          <Link to="/legal" hash="privacy" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Privacy</Link>
          <Link to="/legal" hash="terms" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Terms</Link>
          <Link to="/legal" hash="cookies" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Cookies</Link>
          <Link to="/legal" hash="accessibility" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">Accessibility</Link>
          <Link to="/categories" className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0">All categories</Link>
        </div>
      </div>
    </footer>
  );
}
