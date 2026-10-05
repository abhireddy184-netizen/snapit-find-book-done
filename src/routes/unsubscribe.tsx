import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/snapit/AppShell";
import { unsubscribeFromUpdates } from "@/lib/subscribe.functions";


export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search['token'] === "string" ? (search['token'] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Unsubscribe from GetPros updates" },
      { name: "description", content: "Manage your GetPros email preferences and stop receiving GetPros.ai updates." },
      { property: "og:title", content: "Unsubscribe from GetPros updates" },
      { property: "og:description", content: "Manage your GetPros email preferences in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const unsubscribe = useServerFn(unsubscribeFromUpdates);
  const [state, setState] = useState<"working" | "done" | "not_found" | "error">("working");

  useEffect(() => {
    let active = true;
    if (!token) { setState("not_found"); return; }
    unsubscribe({ data: { token } })
      .then((res) => { if (active) setState(res.result === "unsubscribed" ? "done" : "not_found"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [token, unsubscribe]);

  const copy = {
    working: { title: "Updating your preferences…", body: "One moment while we process your request." },
    done: { title: "You're unsubscribed", body: "You won't receive GetPros updates anymore. You can resubscribe anytime from the GetPros homepage." },
    not_found: { title: "Link not recognised", body: "This unsubscribe link is invalid or has already been used." },
    error: { title: "Something went wrong", body: "We couldn't update your preferences. Please try the link again in a moment." },
  }[state];

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
