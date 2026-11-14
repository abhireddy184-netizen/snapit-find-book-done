import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowUp, MoreHorizontal, X, Mail, RotateCcw, Trash2, ShieldCheck } from "lucide-react";
import { askSupport } from "@/lib/support-chat.functions";
import { CONTACT_EMAIL } from "@/lib/brand";
import {
  PULSE_CATEGORIES,
  PULSE_COPY,
  PULSE_LANG_KEY,
  detectPulseLang,
  type ChipKey,
  type PulseLang,
  type ScriptKey,
} from "@/lib/pulse-copy";
import { cn } from "@/lib/utils";
import { GpaMark } from "./GpaMark";

type Follow = "categories" | "proTopics";
type Msg =
  | { id: number; role: "user"; text?: string; chip?: ChipKey }
  | {
      id: number;
      role: "assistant";
      text?: string;
      script?: ScriptKey;
      source?: "ai" | "faq" | "limited";
      follow?: Follow;
      cta?: boolean;
      /** Set on connection errors: the user text to resend on "Try again". */
      retry?: string;
    };

/** Pages where a floating widget could cover sign-in, checkout or camera UI. */
const HIDDEN_PREFIXES = [
  "/login", "/register", "/reset-password", "/auth", "/book", "/snap",
  "/job", "/tracking", "/dashboard", "/provider-dashboard", "/admin", "/unsubscribe",
];

const GREETING_KEY = "getpros-support-greeting-dismissed";
const MAIN_CHIPS: ChipKey[] = ["findPro", "showProblem", "becomePro", "askPulse"];
const PRO_TOPICS: ChipKey[] = ["proSignup", "pro85", "proNeeds"];

let nextId = 1;
/** Set after the launcher first mounts in this page load, so its entrance never replays. */
let launcherEntered = false;

/** Circular navy→teal avatar carrying the real GPA mark. */
function PulseAvatar({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid shrink-0 place-items-center rounded-full ring-1 ring-pulse-ink/20", className)}
      style={{ background: "var(--gradient-pulse)" }}
    >
      <GpaMark className="w-[62%]" />
    </span>
  );
}

export function SupportChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const ask = useServerFn(askSupport);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lang, setLang] = useState<PulseLang>("en");
  const [greeting, setGreeting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Launcher fades in gently once per page load only; never replays on navigation.
  const [launcherEnter] = useState(() => !launcherEntered);
  useEffect(() => { launcherEntered = true; }, []);
  const t = PULSE_COPY[lang];

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "."));

  // Language: stored choice, otherwise the browser language (read after hydration).
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(PULSE_LANG_KEY); } catch { /* storage blocked */ }
    setLang(detectPulseLang(stored, navigator.languages?.length ? navigator.languages : [navigator.language]));
  }, []);

  useEffect(() => {
    try { if (sessionStorage.getItem(GREETING_KEY)) return; } catch { return; }
    const id = window.setTimeout(() => setGreeting(true), 3500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Mobile full-screen sheet: follow the visual viewport so the composer stays above the keyboard,
  // and stop the page behind from scrolling.
  useEffect(() => {
    if (!open || !isMobile) { setVv(null); return; }
    const v = window.visualViewport;
    const sync = () => setVv(v ? { h: v.height, top: v.offsetTop } : null);
    sync();
    v?.addEventListener("resize", sync);
    v?.addEventListener("scroll", sync);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      v?.removeEventListener("resize", sync);
      v?.removeEventListener("scroll", sync);
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (open && !busy && !isMobile) inputRef.current?.focus();
  }, [open, busy, isMobile]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input]);

  const closeChat = useCallback(() => {
    setMenuOpen(false);
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      window.setTimeout(() => launcherRef.current?.focus(), 0);
    }, 180);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, menuOpen, closeChat]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  if (hidden) return null;

  function dismissGreeting() {
    setGreeting(false);
    try { sessionStorage.setItem(GREETING_KEY, "1"); } catch { /* ignore */ }
  }
  function openChat() {
    dismissGreeting();
    setOpen(true);
  }
  function chooseLang(l: PulseLang) {
    setLang(l);
    try { localStorage.setItem(PULSE_LANG_KEY, l); } catch { /* ignore */ }
  }

  /** Resolve a message to text in the current language (scripted ones re-translate). */
  function textOf(m: Msg): string {
    if (m.role === "user") return m.chip ? t.chips[m.chip].replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, "") : (m.text ?? "");
    return m.script ? t.scripts[m.script] : (m.text ?? "");
  }

  async function send(text: string, base: Msg[] = messages) {
    const content = text.trim().slice(0, 1000);
    if (!content || busy) return;
    const next: Msg[] = [...base, { id: nextId++, role: "user", text: content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const history = next
        .filter((m) => !(m.role === "assistant" && (m.retry !== undefined || m.source === "limited")))
        .map((m) => ({ role: m.role, content: textOf(m).slice(0, 1000) }))
        .filter((m) => m.content.length > 0)
        .slice(-10);
      const res = await ask({ data: { messages: history, lang } });
      setMessages((m) => [...m, { id: nextId++, role: "assistant", text: res.reply, source: res.source }]);
    } catch {
      setMessages((m) => [...m, { id: nextId++, role: "assistant", script: "error", retry: content }]);
    } finally {
      setBusy(false);
      if (!isMobile) window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function retry(msg: Msg) {
    if (msg.role !== "assistant" || !msg.retry) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    // Drop the failed user message + error bubble, then resend.
    void send(msg.retry, messages.slice(0, Math.max(0, idx - 1)));
  }

  function chip(key: ChipKey) {
    if (key === "showProblem") {
      closeChat();
      void navigate({ to: "/snap" });
      return;
    }
    const user: Msg = { id: nextId++, role: "user", chip: key };
    let reply: Msg;
    if (key === "findPro") reply = { id: nextId++, role: "assistant", script: "findPro", follow: "categories" };
    else if (key === "becomePro") reply = { id: nextId++, role: "assistant", script: "becomePro", follow: "proTopics", cta: true };
    else if (key === "askPulse") reply = { id: nextId++, role: "assistant", script: "askPulse" };
    else reply = { id: nextId++, role: "assistant", script: key as ScriptKey, follow: "proTopics", cta: true };
    setMessages((m) => [...m, user, reply]);
    if (key === "askPulse") window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  const canSend = !busy && input.trim().length > 0;
  const last = messages[messages.length - 1];
  const sheetStyle = isMobile && vv ? { height: vv.h, top: vv.top } : undefined;

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-modal={isMobile}
          aria-labelledby="pulse-title"
          lang={lang}
          style={sheetStyle}
          className={cn(
            "fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-card text-card-foreground",
            "sm:inset-auto sm:right-5 sm:bottom-[calc(6.25rem+env(safe-area-inset-bottom))] sm:h-[min(560px,calc(100dvh-8.5rem))] sm:w-[380px] sm:rounded-[20px] sm:border sm:border-border/70",
            "sm:shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--brand-navy)_40%,transparent)]",
            "md:bottom-6 md:h-[min(560px,calc(100dvh-3rem))] lg:right-8 lg:bottom-8 lg:h-[min(560px,calc(100dvh-4rem))]",
            closing ? "gp-pulse-panel-out" : "gp-pulse-panel-in",
          )}
        >
          {/* Header */}
          <header
            className="relative shrink-0 px-4 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] text-pulse-ink sm:pt-3.5"
            style={{ background: "var(--gradient-pulse)" }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-pulse-ink/10 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <PulseAvatar className="mt-0.5 h-11 w-11 ring-2" />
              <div className="min-w-0 flex-1">
                <h2 id="pulse-title" className="brand-font text-[22px] font-extrabold leading-none tracking-[-0.02em]">{t.title}</h2>
                <p className="mt-1 text-[13px] font-medium leading-tight opacity-95">{t.subtitle}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs opacity-90" aria-live="polite">
                  <span className={cn("h-2 w-2 rounded-full", busy ? "bg-pulse-ink/70 motion-safe:animate-pulse" : "bg-pulse-online")} aria-hidden="true" />
                  {busy ? t.connecting : t.online}
                </p>
              </div>
              <div className="relative -mr-1 flex items-center" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={t.more}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-pulse-ink/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-ink"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={closeChat}
                  aria-label={t.close}
                  className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-pulse-ink/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-ink"
                >
                  <X className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div role="menu" className="gp-pulse-msg-in absolute right-0 top-11 z-10 w-56 overflow-hidden rounded-2xl border border-border/70 bg-card p-1.5 text-card-foreground shadow-xl">
                    <a
                      role="menuitem"
                      href={`mailto:${CONTACT_EMAIL}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <Mail className="h-4 w-4 text-brand-teal" />
                      <span className="flex flex-col leading-tight">
                        {t.talkHuman}
                        <span className="text-xs font-normal text-muted-foreground">{CONTACT_EMAIL}</span>
                      </span>
                    </a>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMessages([]); setMenuOpen(false); }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" /> {t.clear}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Language toggle */}
            <div role="group" aria-label={t.langLabel} className="relative mt-3 inline-flex rounded-full bg-pulse-ink/12 p-0.5 text-[13px] font-semibold ring-1 ring-pulse-ink/20">
              {(["en", "es"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  lang={l}
                  onClick={() => chooseLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "min-h-8 rounded-full px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-ink",
                    lang === l ? "bg-pulse-ink text-pulse-deep shadow-sm" : "text-pulse-ink/90 hover:bg-pulse-ink/10",
                  )}
                >
                  {l === "en" ? "English" : "Español"}
                </button>
              ))}
            </div>
          </header>

          {/* Conversation */}
          <div
            ref={listRef}
            className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-5"
            style={{ backgroundColor: "color-mix(in oklab, var(--brand-teal) 4%, var(--card))" }}
            aria-live="polite"
          >
            <AssistantRow>
              <p className="text-foreground">{t.welcome}</p>
            </AssistantRow>

            {messages.length === 0 && (
              <div className="grid grid-cols-1 gap-2 pl-10 min-[400px]:grid-cols-2" role="group" aria-label={t.quickActions}>
                {MAIN_CHIPS.map((k, i) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => chip(k)}
                    className="gp-pulse-msg-in flex min-h-12 items-center rounded-2xl border border-border/80 bg-card px-3.5 py-2.5 text-left text-sm font-semibold leading-snug text-foreground shadow-sm transition-all hover:-translate-y-px hover:border-brand-teal/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal motion-reduce:hover:translate-y-0"
                    style={{ animationDelay: `${80 + i * 60}ms` }}
                  >
                    {t.chips[k]}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="gp-pulse-msg-in flex justify-end">
                  <div className="max-w-[82%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed text-pulse-ink shadow-sm" style={{ background: "var(--gradient-pulse)" }}>
                    {textOf(m)}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="space-y-2.5">
                  <AssistantRow error={m.retry !== undefined}>
                    <RichText text={textOf(m)} />
                    {m.source === "faq" && (
                      <p className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t.faqBadge}</p>
                    )}
                    {m.retry !== undefined && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => retry(m)} disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold hover:border-brand-teal disabled:opacity-50">
                          <RotateCcw className="h-3.5 w-3.5" /> {t.retry}
                        </button>
                        <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold hover:border-brand-teal">
                          <Mail className="h-3.5 w-3.5" /> {t.talkHuman}
                        </a>
                      </div>
                    )}
                  </AssistantRow>
                  {m === last && m.cta && (
                    <div className="gp-pulse-msg-in pl-10">
                      <Link
                        to="/register"
                        search={{ redirect: undefined, role: "provider" }}
                        onClick={closeChat}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-pulse-ink shadow-md transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 motion-reduce:hover:scale-100"
                        style={{ background: "var(--gradient-pulse)" }}
                      >
                        {t.joinPro} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                  {m === last && m.follow === "categories" && (
                    <div className="flex flex-wrap gap-2 pl-10" role="group" aria-label={t.chips.findPro}>
                      {PULSE_CATEGORIES.map((c, i) => (
                        <Link
                          key={c.slug}
                          to="/services/$category"
                          params={{ category: c.slug }}
                          onClick={closeChat}
                          className="gp-pulse-msg-in inline-flex min-h-10 items-center rounded-full border border-border/80 bg-card px-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-brand-teal/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {c[lang]}
                        </Link>
                      ))}
                      <Link
                        to="/services"
                        onClick={closeChat}
                        className="gp-pulse-msg-in inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                      >
                        {t.browseAll} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                  {m === last && m.follow === "proTopics" && (
                    <div className="flex flex-wrap gap-2 pl-10" role="group" aria-label={t.chips.becomePro}>
                      {PRO_TOPICS.filter((k) => k !== m.script).map((k, i) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => chip(k)}
                          className="gp-pulse-msg-in inline-flex min-h-10 items-center rounded-full border border-border/80 bg-card px-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-brand-teal/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {t.chips[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <AssistantRow>
                <span className="flex items-center gap-1 py-1.5" role="status" aria-label={t.typing}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="gp-pulse-dot h-2 w-2 rounded-full bg-brand-teal" style={{ animationDelay: `${d * 160}ms` }} />
                  ))}
                </span>
              </AssistantRow>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="shrink-0 border-t border-border/70 bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:pb-3"
          >
            <div className="flex items-end gap-2 rounded-[1.4rem] border border-input bg-background py-1.5 pl-4 pr-1.5 transition-shadow focus-within:border-brand-teal focus-within:ring-4 focus-within:ring-brand-teal/15">
              <label htmlFor="pulse-input" className="sr-only">{t.inputLabel}</label>
              <textarea
                id="pulse-input"
                ref={inputRef}
                rows={1}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); }
                }}
                placeholder={busy ? t.placeholderBusy : t.placeholder}
                className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent py-1.5 text-base leading-6 shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0 sm:text-[15px]"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={t.send}
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2",
                  canSend ? "text-pulse-ink shadow-md hover:scale-105 motion-reduce:hover:scale-100" : "bg-muted text-muted-foreground",
                )}
                style={canSend ? { background: "var(--gradient-pulse)" } : undefined}
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            </div>
            <p className="mt-2 flex items-start gap-1.5 px-1 text-[11px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-brand-teal" aria-hidden="true" />
              <span>
                {t.disclaimer}{" "}
                <a className="font-semibold text-foreground underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
            </p>
          </form>
        </section>
      )}

      <div className="pointer-events-none fixed right-3 z-[45] bottom-[calc(6.25rem+env(safe-area-inset-bottom))] sm:right-5 md:bottom-6 lg:right-8 lg:bottom-8">
        {!open && greeting && (
          <div lang={lang} className="pointer-events-auto absolute bottom-[4.75rem] right-0 w-[min(17rem,calc(100vw-1.5rem))] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <div className="relative rounded-2xl rounded-br-md border border-border/70 bg-card p-4 pr-9 shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--brand-navy)_40%,transparent)]">
              <button type="button" onClick={openChat} className="flex items-start gap-3 text-left focus-visible:outline-none">
                <PulseAvatar className="h-9 w-9" />
                <span>
                  <span className="block text-sm font-bold text-foreground">{t.teaserTitle}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{t.teaserBody}</span>
                </span>
              </button>
              <button type="button" onClick={dismissGreeting} aria-label={t.dismiss} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
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
            aria-label={t.open}
            aria-expanded={false}
            className={cn("group pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full text-pulse-ink shadow-[0_14px_34px_-12px_color-mix(in_oklab,var(--brand-navy)_65%,transparent)] ring-[3px] ring-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-brand-teal motion-reduce:hover:scale-100 md:h-[60px] md:w-[60px]", launcherEnter && "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500")}
            style={{ background: "var(--gradient-pulse)" }}
          >
            <span aria-hidden="true" className="gp-pulse-ring pointer-events-none absolute inset-0 rounded-full border-2 border-brand-teal" />
            <svg viewBox="0 0 60 60" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
              <path
                className="gp-pulse-ekg"
                d="M5 31h33l2.5-6 3 12 3-9 2 3H55"
                stroke="currentColor"
                strokeOpacity="0.85"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <GpaMark className="relative w-[58%] drop-shadow-[0_1px_2px_rgb(0_0_0/0.25)]" />
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-pulse-online ring-2 ring-card" aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}

function AssistantRow({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div className="gp-pulse-msg-in flex items-end gap-2.5">
      <PulseAvatar className="h-7 w-7" />
      <div
        className={cn(
          "max-w-[85%] rounded-[1.25rem] rounded-bl-md border bg-card px-4 py-3 text-[15px] leading-relaxed shadow-sm",
          error ? "border-destructive/40" : "border-border/60",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Minimal safe formatter for replies: **bold**, bullet and numbered lines. No HTML injection. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
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
