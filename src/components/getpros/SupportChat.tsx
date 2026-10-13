import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, ChevronDown, X, Briefcase, MapPin, LifeBuoy, Sparkle, ShieldCheck } from "lucide-react";
import { askSupport } from "@/lib/support-chat.functions";
import { CONTACT_EMAIL } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; source?: "ai" | "faq" | "limited" };

const SUGGESTIONS = [
  { q: "How does GetPros work?", icon: Sparkle },
  { q: "How do I become a Pro?", icon: Briefcase },
  { q: "Is it available in my area?", icon: MapPin },
  { q: "How do I get help?", icon: LifeBuoy },
];

/** Pages where a floating widget could cover sign-in, checkout or camera UI. */
const HIDDEN_PREFIXES = [
  "/login", "/register", "/reset-password", "/auth", "/book", "/snap",
  "/job", "/tracking", "/dashboard", "/provider-dashboard", "/admin", "/unsubscribe",
];

const GREETING_KEY = "getpros-support-greeting-dismissed";

/** Geometric brand glyph: a speech bubble built from the navy→teal palette. */
function BrandGlyph({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid shrink-0 place-items-center rounded-2xl", className)}
      style={{ background: "var(--gradient-primary)" }}
    >
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="none">
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h0.5A2.5 2.5 0 0 1 5 12.5z" fill="var(--primary-foreground)" fillOpacity="0.95" />
        <circle cx="9.5" cy="9.5" r="1.1" fill="var(--brand-navy)" />
        <circle cx="12" cy="9.5" r="1.1" fill="var(--brand-teal)" />
        <circle cx="14.5" cy="9.5" r="1.1" fill="var(--brand-navy)" />
      </svg>
    </span>
  );
}

export function SupportChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ask = useServerFn(askSupport);
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "."));

  useEffect(() => {
    if (sessionStorage.getItem(GREETING_KEY)) return;
    const t = window.setTimeout(() => setGreeting(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && !busy) inputRef.current?.focus();
  }, [open, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hidden) return null;

  function dismissGreeting() {
    setGreeting(false);
    sessionStorage.setItem(GREETING_KEY, "1");
  }
  function openChat() {
    dismissGreeting();
    setOpen(true);
  }
  function close() {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  async function send(text: string) {
    const content = text.trim().slice(0, 1000);
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({
        data: { messages: next.slice(-10).map(({ role, content }) => ({ role, content })) },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, source: res.source }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", source: "faq", content: `Sorry, I couldn't reply just now. Please try again or email ${CONTACT_EMAIL}.` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const canSend = !busy && input.trim().length > 0;

  return (
    <div className="pointer-events-none fixed right-3 z-[45] bottom-[calc(6.25rem+env(safe-area-inset-bottom))] sm:right-5 md:bottom-6 lg:right-8 lg:bottom-8">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="support-chat-title"
          className="pointer-events-auto absolute bottom-0 right-0 flex h-[min(36rem,calc(100dvh-8.5rem-env(safe-area-inset-bottom)))] w-[min(24rem,calc(100vw-1.5rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card text-card-foreground shadow-[0_30px_80px_-24px_color-mix(in_oklab,var(--brand-navy)_45%,transparent)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 md:h-[min(38rem,calc(100dvh-4rem))] md:w-[25rem]"
        >
          {/* Header */}
          <header className="relative overflow-hidden px-5 pb-5 pt-4 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-6 h-32 w-32 rounded-full bg-brand-teal/40 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <span className="brand-font text-[15px] font-extrabold tracking-[-0.03em]">
                Get<span className="opacity-80">Pros</span><span className="opacity-60">.ai</span>
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={close} aria-label="Minimize chat" className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
                  <ChevronDown className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => { setMessages([]); close(); }} aria-label="Close chat and clear conversation" className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25 backdrop-blur">
                <BrandGlyph className="h-8 w-8 rounded-xl" />
              </span>
              <div className="min-w-0">
                <h2 id="support-chat-title" className="text-base font-bold leading-tight tracking-tight">GetPros Assistant</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs opacity-90">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground/70 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                  </span>
                  AI assistant · replies instantly, 24/7
                </p>
              </div>
            </div>
          </header>

          {/* Conversation */}
          <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5"
            style={{ backgroundColor: "color-mix(in oklab, var(--brand-teal) 4%, var(--card))" }}
            aria-live="polite"
          >
            <AssistantRow>
              <p className="font-semibold text-foreground">Hi there 👋</p>
              <p className="mt-1 text-muted-foreground">
                I'm GetPros AI. Ask me how GetPros works, joining as a Pro, or where we're available. Any language is fine.
              </p>
            </AssistantRow>

            {messages.length === 0 && (
              <div className="grid gap-2 pl-10" role="group" aria-label="Suggested questions">
                {SUGGESTIONS.map(({ q, icon: Icon }, i) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="group flex items-center gap-2.5 rounded-2xl border border-border/80 bg-card px-3.5 py-2.5 text-left text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-px hover:border-brand-teal/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-reduce:transform-none"
                    style={{ animationDelay: `${80 + i * 60}ms`, animationFillMode: "backwards" }}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-teal/12 text-brand-teal">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">{q}</span>
                    <ArrowUp className="h-3.5 w-3.5 rotate-45 text-muted-foreground transition-colors group-hover:text-brand-teal" />
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
                  <div className="max-w-[82%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md bg-brand-navy px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
                    {m.content}
                  </div>
                </div>
              ) : (
                <AssistantRow key={i}>
                  <RichText text={m.content} />
                  {m.source === "faq" && (
                    <p className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Standard answer — AI assistant unavailable
                    </p>
                  )}
                </AssistantRow>
              ),
            )}

            {busy && (
              <AssistantRow>
                <span className="flex items-center gap-1 py-1.5" role="status" aria-label="Assistant is typing">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 rounded-full bg-brand-teal motion-safe:animate-bounce" style={{ animationDelay: `${d * 140}ms` }} />
                  ))}
                </span>
              </AssistantRow>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="border-t border-border/70 bg-card px-3 pb-3 pt-3">
            <div className="flex items-end gap-2 rounded-[1.4rem] border border-input bg-background py-1.5 pl-4 pr-1.5 transition-shadow focus-within:border-brand-teal focus-within:ring-4 focus-within:ring-brand-teal/15">
              <label htmlFor="support-chat-input" className="sr-only">Your question</label>
              <textarea
                id="support-chat-input"
                ref={inputRef}
                rows={1}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
                }}
                placeholder={busy ? "GetPros AI is replying…" : "Ask anything about GetPros…"}
                className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent py-1.5 shadow-none ring-0 focus:outline-none focus:ring-0 focus-visible:ring-0 text-base leading-6 outline-none placeholder:text-muted-foreground sm:text-[15px]"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2",
                  canSend ? "text-primary-foreground shadow-md hover:scale-105" : "bg-muted text-muted-foreground",
                )}
                style={canSend ? { background: "var(--gradient-primary)" } : undefined}
              >
                <ArrowUp className="h-4.5 w-4.5" />
              </button>
            </div>
            <p className="mt-2 flex items-start gap-1.5 px-1 text-[11px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-brand-teal" aria-hidden="true" />
              <span>
                AI-generated answers may be wrong. Never share card or password details. Account help:{" "}
                <a className="font-semibold text-foreground underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
            </p>
          </form>
        </section>
      )}

      {!open && greeting && (
        <div className="pointer-events-auto absolute bottom-[4.5rem] right-0 w-[min(17rem,calc(100vw-1.5rem))] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
          <div className="relative rounded-2xl rounded-br-md border border-border/70 bg-card p-4 pr-9 shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--brand-navy)_40%,transparent)]">
            <button type="button" onClick={openChat} className="flex items-start gap-3 text-left focus-visible:outline-none">
              <BrandGlyph className="h-9 w-9 rounded-xl" />
              <span>
                <span className="block text-sm font-bold text-foreground">Hi there 👋 Need help?</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                  Ask <span className="font-semibold text-brand-teal">GetPros AI</span> — instant answers, any language.
                </span>
              </span>
            </button>
            <button type="button" onClick={dismissGreeting} aria-label="Dismiss message" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={openChat}
          aria-label="Open GetPros support chat"
          aria-expanded={false}
          className="group pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full text-primary-foreground shadow-[0_16px_40px_-12px_color-mix(in_oklab,var(--brand-navy)_60%,transparent)] ring-[3px] ring-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-brand-teal motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:fade-in"
          style={{ background: "var(--gradient-primary)" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
            <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v6.5A2.5 2.5 0 0 1 17 15.5h-5.5L7 19.5v-4A2.5 2.5 0 0 1 4.5 13z" fill="currentColor" />
            <circle cx="9" cy="9.75" r="1.1" fill="var(--brand-navy)" />
            <circle cx="12" cy="9.75" r="1.1" fill="var(--brand-teal)" />
            <circle cx="15" cy="9.75" r="1.1" fill="var(--brand-navy)" />
          </svg>
          <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-brand-teal ring-2 ring-card" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function AssistantRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
      <BrandGlyph className="h-7 w-7 rounded-lg" />
      <div className="max-w-[85%] rounded-[1.25rem] rounded-bl-md border border-border/60 bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

/** Minimal safe formatter for AI replies: **bold**, bullet and numbered lines. No HTML injection. */
function inline(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : part,
  );
}
function RichText({ text }: { text: string }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5 text-foreground">
      {lines.map((l, i) => {
        const bullet = /^[-*•]\s+/.exec(l);
        const num = /^(\d+)[.)]\s+/.exec(l);
        if (bullet || num) {
          const body = l.slice((bullet ?? num)![0].length);
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-0.5 shrink-0 font-semibold text-brand-teal">{num ? `${num[1]}.` : "•"}</span>
              <span>{inline(body)}</span>
            </div>
          );
        }
        return <p key={i}>{inline(l)}</p>;
      })}
    </div>
  );
}
