import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Minus, Send, X, Headset } from "lucide-react";
import { askSupport } from "@/lib/support-chat.functions";
import { CONTACT_EMAIL } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; source?: "ai" | "faq" | "limited" };

const SUGGESTIONS = [
  "How does GetPros work?",
  "How do I become a Pro?",
  "Is it available in my area?",
  "How do I get help?",
];

/** Pages where a floating widget could cover sign-in, checkout or camera UI. */
const HIDDEN_PREFIXES = [
  "/login", "/register", "/reset-password", "/auth", "/book", "/snap",
  "/job", "/tracking", "/dashboard", "/provider-dashboard", "/admin", "/unsubscribe",
];

const GREETING_KEY = "getpros-support-greeting-dismissed";

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
    const t = window.setTimeout(() => setGreeting(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

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
    launcherRef.current?.focus();
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

  return (
    <div className="fixed right-3 z-[45] bottom-[calc(6.5rem+env(safe-area-inset-bottom))] sm:right-5 md:bottom-6">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="support-chat-title"
          className="absolute bottom-0 right-0 flex h-[min(34rem,calc(100dvh-9rem))] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-elevated"
        >
          <header className="flex items-center gap-3 px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15 ring-1 ring-primary-foreground/30">
              <Headset className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="support-chat-title" className="text-sm font-bold leading-tight">GetPros Assistant</h2>
              <p className="text-[11px] leading-tight opacity-85">AI answers, 24/7 · Humans via email</p>
            </div>
            <button type="button" onClick={close} aria-label="Minimize chat" className="grid h-9 w-9 place-items-center rounded-full hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { setMessages([]); close(); }} aria-label="Close chat and clear conversation" className="grid h-9 w-9 place-items-center rounded-full hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="max-w-[88%] text-sm leading-relaxed">
              Hi! 👋 I'm the GetPros AI assistant. Ask me anything about using GetPros, in any language.
            </div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-navy px-3.5 py-2 text-sm text-primary-foreground">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="max-w-[92%] text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.source === "faq" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Standard answer — AI assistant unavailable</p>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="flex gap-1 py-1" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brand-teal" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="border-t border-border px-3 pb-2 pt-2"
          >
            <div className="flex items-end gap-2">
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
                placeholder="Ask a question…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              Answers are AI-generated and may be wrong. Never share card or password details. Account help: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </form>
        </section>
      )}

      {!open && greeting && (
        <div className="absolute bottom-16 right-0 w-60 rounded-2xl border border-border bg-card p-3 pr-8 text-sm shadow-elevated">
          <button type="button" onClick={openChat} className="text-left">
            <span className="font-bold">Questions about GetPros?</span>
            <span className="block text-xs text-muted-foreground">Get instant answers from our AI assistant.</span>
          </button>
          <button type="button" onClick={dismissGreeting} aria-label="Dismiss message" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={openChat}
          aria-label="Open GetPros support chat"
          aria-expanded={open}
          className={cn("grid h-14 w-14 place-items-center rounded-full text-primary-foreground shadow-elevated ring-[3px] ring-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-primary")}
          style={{ background: "var(--gradient-primary)" }}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
