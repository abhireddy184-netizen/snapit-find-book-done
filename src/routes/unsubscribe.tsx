import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/getpros/AppShell";
import { subscribeToUpdates, unsubscribeFromUpdates } from "@/lib/subscribe.functions";


export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search['token'] === "string" ? (search['token'] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Unsubscribe from GetPros updates — GetPros.ai" },
      { name: "description", content: "Manage your GetPros email preferences and stop receiving GetPros.ai updates." },
      { property: "og:title", content: "Unsubscribe from GetPros updates — GetPros.ai" },
      { property: "og:description", content: "Manage your GetPros email preferences in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Unsubscribe from GetPros updates — GetPros.ai" },
      { name: "twitter:description", content: "Manage your GetPros email preferences in one tap." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const unsubscribe = useServerFn(unsubscribeFromUpdates);
  const [state, setState] = useState<"working" | "done" | "not_found" | "error" | "no_token">(token ? "working" : "no_token");

  useEffect(() => {
    let active = true;
    if (!token) { setState("no_token"); return; }
    unsubscribe({ data: { token } })
      .then((res) => { if (active) setState(res.result === "unsubscribed" ? "done" : "not_found"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [token, unsubscribe]);

  if (state === "no_token") {
    return (
      <AppShell>
        <section className="mx-auto mt-10 max-w-lg surface-card p-6 text-center sm:p-8">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Manage your email preferences</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter your email to subscribe to GetPros updates, or use the unsubscribe link in any email you received from us.
          </p>
          <PreferencesForm />
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            Back to GetPros
          </Link>
        </section>
      </AppShell>
    );
  }

  const copy = {
    working: { title: "Updating your preferences…", body: "One moment while we process your request." },
    done: { title: "You're unsubscribed", body: "You won't receive GetPros updates anymore. You can resubscribe anytime from the GetPros homepage." },
    not_found: { title: "Link not recognised", body: "This unsubscribe link is invalid or has already been used." },
    error: { title: "Something went wrong", body: "We couldn't update your preferences. Please try the link again in a moment." },
  }[state as "working" | "done" | "not_found" | "error"];

  return (
    <AppShell>
      <section className="mx-auto mt-10 max-w-lg surface-card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">{copy.title}</h1>
        <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{copy.body}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          Back to GetPros
        </Link>
      </section>
    </AppShell>
  );
}

function PreferencesForm() {
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
      const res = await subscribe({ data: { email: value, source: "unsubscribe_page" } });
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
    <form
      onSubmit={submit}
      noValidate
      className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:overflow-hidden sm:rounded-full sm:border sm:border-border/60 sm:bg-card sm:p-1 sm:shadow-sm"
    >
      <label htmlFor="gpb-preferences-email" className="sr-only">Email address for GetPros updates</label>
      <input
        id="gpb-preferences-email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (state !== "idle") { setState("idle"); setMessage(""); } }}
        autoComplete="email"
        aria-invalid={state === "error"}
        aria-describedby="gpb-preferences-status"
        placeholder="you@email.com"
        className="min-w-0 flex-1 rounded-full border border-border/60 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground sm:rounded-none sm:border-0 sm:px-3"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="shrink-0 rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
        style={{ background: "var(--gradient-primary)" }}
      >
        {state === "submitting" ? "Subscribing…" : "Subscribe"}
      </button>
      <p
        id="gpb-preferences-status"
        role="status"
        aria-live="polite"
        className={`basis-full text-left text-xs font-semibold ${state === "error" ? "text-destructive" : "text-foreground"}`}
      >
        {message}
      </p>
    </form>
  );
}
