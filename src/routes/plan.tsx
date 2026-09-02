import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowUp, ArrowDown, Clock, Loader2, MapPin, RotateCcw, Sparkles,
  TriangleAlert, Undo2, HardHat, Languages, HelpCircle, ShoppingBasket, UtensilsCrossed, CarFront, UserRound, CircleSlash,
  MessageCircle, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/snapit/AppShell";
import { buildPlan, type PlanResult } from "@/lib/plan.functions";
import {
  addDays, CHANNEL_META, DEFAULT_UI_COPY, demoAirportPlan, formatClock, formatPlanDate, move, parseClock,
  planDeadlineMinutes, planEndMinutes, planLocale, resequence, uiCopy,
  type ExecutionChannel, type GpbPlan, type PlanTask, type PlanUiCopy,
} from "@/lib/plan-model";


type Copy = Required<PlanUiCopy>;

type PlanSearch = { q: string; loc: string; demo?: boolean };

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 100000) {
    return String(v).padStart(5, "0");
  }
  return v == null ? "" : String(v);
}

export const Route = createFileRoute("/plan")({
  validateSearch: (search: Record<string, unknown>): PlanSearch => ({
    ...(search['demo'] ? { demo: true } : {}),
    q: asString(search['q']),
    loc: asString(search['loc']),
  }),
  head: () => ({
    meta: [
      { title: "Your GPB Plan — one plan for what you need done" },
      { name: "description", content: "Tell GPB what you need done and get one clear plan with steps and timing. Nothing is booked until you say so." },
      { property: "og:title", content: "Your GPB Plan — one plan for what you need done" },
      { property: "og:description", content: "GPB turns what you need done into one clear, timed plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Your GPB plan" },
      { name: "twitter:description", content: "One request. One clear plan." },
    ],
  }),
  component: PlanPage,
});

const CHANNEL_ICON: Record<ExecutionChannel, LucideIcon> = {
  "gpb-pro": HardHat,
  "food-partner": UtensilsCrossed,
  "grocery-partner": ShoppingBasket,
  "ride-partner": CarFront,
  "user-action": UserRound,
  "not-supported": CircleSlash,
};

function nowClockString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Today's local calendar date, so future-dated requests schedule correctly. */
function nowDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function PlanPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const runBuildPlan = useServerFn(buildPlan);
  const isDemo = search.demo || !search.q.trim();

  const query = useQuery({
    queryKey: ["gpb-plan", search.q, search.loc],
    enabled: !isDemo,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () =>
      runBuildPlan({
        data: {
          request: search.q,
          location: search.loc,
          nowClock: nowClockString(),
          nowDate: nowDateString(),
          ...(localTimeZone() ? { timeZone: localTimeZone() as string } : {}),
        },
      }) as Promise<PlanResult>,
  });

  const result = query.data;
  const conversation =
    !isDemo && result?.kind === "conversation"
      ? (result as Extract<PlanResult, { kind: "conversation" }>)
      : undefined;


  const basePlan: GpbPlan | undefined = isDemo
    ? demoAirportPlan()
    : result?.kind === "plan"
      ? result.plan
      : undefined;


  const [plan, setPlan] = useState<GpbPlan | undefined>(basePlan);
  const [replanApplied, setReplanApplied] = useState(false);
  const [replanDismissed, setReplanDismissed] = useState(false);
  const [clarifyDismissed, setClarifyDismissed] = useState(false);

  useEffect(() => {
    setPlan(basePlan);
    setReplanApplied(false);
    setReplanDismissed(false);
    setClarifyDismissed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePlan?.outcome, basePlan?.source, query.dataUpdatedAt, isDemo]);

  const update = (tasks: PlanTask[]) =>
    setPlan((p) => (p ? { ...p, tasks: resequence(tasks) } : p));

  const applyReplan = () => {
    setPlan((p) => {
      if (!p) return p;
      const tasks = p.tasks.map((t) =>
        t.swappable
          ? {
              ...t,
              title: t.title.replace(/pickup|run|stop/i, "delivery").trim() || "Grocery delivery",
              detail: "Switched to delivery to your door so the route goes straight to the destination.",
              channel: "grocery-partner" as ExecutionChannel,
              durationMinutes: 0,
              parallel: true,
              locationNote: "Delivered while you travel",
            }
          : t,
      );
      return { ...p, tasks: resequence(tasks) };
    });
    setReplanApplied(true);
  };

  const resetPlan = () => {
    setPlan(basePlan);
    setReplanApplied(false);
    setReplanDismissed(false);
  };

  // Before a plan exists the language is unknown, so the header falls back to
  // neutral English defaults; it re-renders in the user's language on arrival.
  const c = plan ? uiCopy(plan) : DEFAULT_UI_COPY;

  return (
    <AppShell>
      <PlanHeader
        c={c}
        request={search.q}
        loc={search.loc}
        isDemo={isDemo}
        onSubmit={(q, loc) => void navigate({ to: "/plan", search: { q, loc } })}
      />

      {!isDemo && query.isPending && <PlanSkeleton request={search.q} />}
      {!isDemo && query.isError && (
        <div className="mt-6 rounded-[24px] border border-destructive/30 bg-card p-5">
          <p dir="auto" className="text-sm font-bold text-destructive">{c.errorTitle}</p>
          <button
            onClick={() => void query.refetch()}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> {c.retryLabel}
          </button>
        </div>
      )}

      {conversation && (
        <ConversationCard request={search.q} reply={conversation.reply} invitation={conversation.invitation} />
      )}

      {plan && (

        <>
          <PlanSummary plan={plan} isDemo={isDemo} />

          {!isDemo && plan.understanding?.clarificationQuestion && !clarifyDismissed && (
            <ClarifyCard
              plan={plan}
              onAnswer={(answer) =>
                void navigate({
                  to: "/plan",
                  search: { q: `${search.q} — ${answer}`, loc: search.loc },
                })
              }
              onDismiss={() => setClarifyDismissed(true)}
            />
          )}

          {plan.replan && !replanDismissed && (
            <ReplanCard
              plan={plan}
              applied={replanApplied}
              onApply={applyReplan}
              onKeep={() => setReplanDismissed(true)}
            />
          )}

          <Timeline plan={plan} onChange={update} onReset={resetPlan} />
          <PlanDetails plan={plan} />
          <NextSteps c={c} />
        </>
      )}
    </AppShell>
  );
}

/* ---------------- header / composer ---------------- */

function PlanHeader({
  c, request, loc, isDemo, onSubmit,
}: { c: Copy; request: string; loc: string; isDemo: boolean; onSubmit: (q: string, loc: string) => void }) {
  const [q, setQ] = useState(request);
  const [l, setL] = useState(loc);
  useEffect(() => setQ(request), [request]);
  useEffect(() => setL(loc), [loc]);

  return (
    <section className="fade-up">
      <h1 dir="auto" className="text-[clamp(1.6rem,4vw,2.6rem)] font-black leading-tight tracking-tight">
        {c.pageTitle}
      </h1>
      <p dir="auto" className="mt-2 max-w-[58ch] text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
        {isDemo
          ? "Here's an example plan. Describe what you need below to build your own."
          : c.pageIntro}
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) onSubmit(q.trim(), l.trim()); }}
        className="mt-5 grid gap-2 rounded-[24px] border border-border/60 bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
      >
        <div className="grid min-w-0 gap-2">
          <label htmlFor="plan-request" className="sr-only">{c.requestPlaceholder}</label>
          <textarea
            id="plan-request"
            dir="auto"
            rows={3}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={c.requestPlaceholder}
            className="min-h-[92px] w-full resize-y rounded-2xl bg-muted/40 px-4 py-3 text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground focus:bg-muted/60"
          />
          <label htmlFor="plan-loc" className="sr-only">{c.locationPlaceholder}</label>
          <input
            id="plan-loc"
            dir="auto"
            value={l}
            onChange={(e) => setL(e.target.value)}
            placeholder={c.locationPlaceholder}
            className="w-full rounded-2xl bg-muted/40 px-4 py-2.5 text-[16px] outline-none placeholder:text-muted-foreground focus:bg-muted/60"
          />
        </div>
        <button
          type="submit"
          data-analytics-id="build_plan"
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.01]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-4 w-4" /> {c.buildLabel}
        </button>
      </form>
    </section>
  );
}

function PlanSkeleton({ request }: { request: string }) {
  return (
    <div className="mt-6 rounded-[24px] border border-border/60 bg-card p-6">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> GPB is sequencing your plan…
      </p>
      <p dir="auto" className="mt-1 text-xs text-muted-foreground">“{request}”</p>
      <div className="mt-4 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

/* ---------------- conversational reply ---------------- */

/**
 * Shown when the message carried no task at all — a greeting, a joke, a test or
 * a general question. GPB answers briefly in the person's own language and
 * invites them to say what they need, instead of inventing a plan.
 *
 * The person's own words and GPB's reply are shown as two clearly separate
 * blocks: GPB's banter is never presented as something the user asked for, and
 * it never becomes the request text in the composer above.
 */
function ConversationCard({
  request, reply, invitation,
}: { request: string; reply: string; invitation?: string | undefined }) {
  return (
    <section aria-live="polite" className="mt-6 space-y-3">
      {request.trim() && (
        <div className="rounded-[22px] border border-border/60 bg-muted/40 p-4 sm:p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">You said</p>
          <p dir="auto" className="mt-1 reply-text break-words">{request.trim()}</p>
        </div>
      )}
      <div className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-primary">GPB</p>
            <p dir="auto" className="mt-1 reply-text font-bold break-words">{reply}</p>
            {invitation && (
              <p dir="auto" className="mt-2 text-[15px] leading-relaxed text-muted-foreground break-words sm:text-base">{invitation}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


/* ---------------- summary ---------------- */

function PlanSummary({ plan, isDemo }: { plan: GpbPlan; isDemo: boolean }) {
  const c = uiCopy(plan);
  const locale = planLocale(plan);
  const end = planEndMinutes(plan);
  // Deadline is measured from the plan's own start day, so a target on a later
  // date is never reported as hundreds of minutes "over".
  const deadline = planDeadlineMinutes(plan);
  const slack = deadline == null ? null : deadline - end;
  const startDateLabel = formatPlanDate(plan.startDate, locale);
  const deadlineDateLabel = formatPlanDate(plan.deadlineDate ?? plan.startDate, locale);
  // Only worth showing the day on the target when it differs from the start day.
  const showDeadlineDate = Boolean(plan.deadlineDate && plan.deadlineDate !== plan.startDate);
  // The plan can run past midnight (a late outing), so carry the day forward.
  const endDateLabel = end >= 1440 ? formatPlanDate(addDays(plan.startDate, Math.floor(end / 1440)), locale) : null;

  return (
    <section className="mt-6 overflow-hidden rounded-[26px] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {isDemo && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
            Example plan
          </span>
        )}
        {plan.understanding && !plan.understanding.languageCode.toLowerCase().startsWith("en") && (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            <Languages className="h-3 w-3 shrink-0 text-primary" />
            <span dir="auto" className="truncate">{plan.understanding.languageName}</span>
          </span>
        )}
        {startDateLabel && (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
            <CalendarDays className="h-3 w-3 shrink-0 text-primary" />
            <span dir="auto" className="truncate">
              {startDateLabel}
              {plan.timeZone ? ` · ${plan.timeZone}` : ""}
            </span>
          </span>
        )}
      </div>
      <h2 dir="auto" className="mt-2 text-lg font-black leading-snug tracking-tight sm:text-xl">{plan.outcome}</h2>
      <p dir="auto" className="mt-1.5 max-w-[70ch] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">{plan.summary}</p>

      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <Stat
          label={c.planStartsLabel}
          value={formatClock(parseClock(plan.startClock), locale)}
          sub={startDateLabel}
          icon={Clock}
        />
        <Stat
          label={plan.deadline ? c.targetLabel : c.planEndsLabel}
          value={formatClock(plan.deadline ? parseClock(plan.deadline) : end, locale)}
          // Show the day whenever the target sits on another date, and whenever
          // the plan itself runs past midnight — "2:01" alone is ambiguous.
          sub={plan.deadline ? (showDeadlineDate ? deadlineDateLabel : null) : endDateLabel}
          icon={Clock}
        />
        <Stat
          label={slack == null ? c.stepsLabel : c.bufferLabel}
          value={
            slack == null
              ? `${plan.tasks.filter((t) => t.status !== "skipped").length} ${c.tasksWord}`
              : slack >= 0
                ? `${slack} ${c.minutesShort} ${c.spareSuffix}`
                : `${Math.abs(slack)} ${c.minutesShort} ${c.overSuffix}`
          }
          icon={slack != null && slack < 0 ? TriangleAlert : MapPin}
          tone={slack != null && slack < 0 ? "danger" : undefined}
        />
      </dl>

    </section>
  );

}

function Stat({
  label, value, icon: Icon, tone, sub,
}: { label: string; value: string; icon: LucideIcon; tone?: "danger"; sub?: string | null }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === "danger" ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-background"}`}>
      <dt dir="auto" className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "danger" ? "text-destructive" : "text-primary"}`} /> {label}
      </dt>
      <dd dir="auto" className={`mt-0.5 text-base font-black tracking-tight ${tone === "danger" ? "text-destructive" : ""}`}>{value}</dd>
      {sub && <dd dir="auto" className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{sub}</dd>}
    </div>
  );
}


/* ---------------- clarification card ---------------- */

/**
 * Shown only when the understanding layer flagged a genuinely critical
 * ambiguity (AM vs PM, which airport, pickup vs dropoff, which person).
 * The answer may be written in any language; it is merged with the original
 * request and the plan is rebuilt.
 */
function ClarifyCard({
  plan, onAnswer, onDismiss,
}: { plan: GpbPlan; onAnswer: (answer: string) => void; onDismiss: () => void }) {
  const c = uiCopy(plan);
  const [answer, setAnswer] = useState("");
  const question = plan.understanding?.clarificationQuestion ?? "";

  return (
    <section
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-[24px] border border-primary/30 bg-card p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <HelpCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="text-sm font-black tracking-tight sm:text-base">{c.clarifyTitle}</h3>
          <p dir="auto" className="mt-1 text-[17px] leading-relaxed break-words hyphens-auto text-foreground">{question}</p>
          <p dir="auto" className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.clarifyHint}</p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (answer.trim()) onAnswer(answer.trim()); }}
            className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <label htmlFor="gpb-clarify" className="sr-only">{c.clarifyTitle}</label>
            <input
              id="gpb-clarify"
              dir="auto"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={c.clarifyPlaceholder}
              className="w-full min-w-0 rounded-2xl bg-muted/40 px-4 py-3 text-[16px] outline-none placeholder:text-muted-foreground focus:bg-muted/60"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                data-analytics-id="clarify_submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white shadow-md transition-transform hover:scale-[1.01] sm:flex-none"
                style={{ background: "var(--gradient-primary)" }}
              >
                {c.clarifySubmit} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
              >
                {c.clarifyDismiss}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ---------------- re-plan card ---------------- */

function ReplanCard({
  plan, applied, onApply, onKeep,
}: { plan: GpbPlan; applied: boolean; onApply: () => void; onKeep: () => void }) {
  const r = plan.replan!;
  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-[24px] border border-[color:var(--color-accent)]/40 bg-card p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--color-accent)]/12 text-[color:var(--color-accent)]">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black tracking-tight sm:text-base">A faster option is available.</h3>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {r.headline}. {r.body}
          </p>
          {applied ? (
            <p className="mt-3 text-sm font-bold text-primary">
              Plan updated — the stop now runs as delivery while you travel.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onApply}
                data-analytics-id="replan_apply"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black text-white shadow-md transition-transform hover:scale-[1.02]"
                style={{ background: "var(--gradient-primary)" }}
              >
                {r.applyLabel} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onKeep}
                data-analytics-id="replan_keep"
                className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold hover:bg-muted"
              >
                {r.keepLabel}
              </button>
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            This traffic example is simulated — live traffic updates aren't connected yet.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- timeline ---------------- */

function Timeline({
  plan, onChange, onReset,
}: { plan: GpbPlan; onChange: (t: PlanTask[]) => void; onReset: () => void }) {
  const start = parseClock(plan.startClock);
  const c = uiCopy(plan);
  const locale = planLocale(plan);

  return (
    <section className="mt-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 dir="auto" className="text-[clamp(1.25rem,2.6vw,1.7rem)] font-black tracking-tight">{c.stepsHeading}</h2>
          <p dir="auto" className="mt-1 text-[15px] text-muted-foreground sm:text-base">{c.stepsHint}</p>
        </div>
        <button
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted"
        >
          <Undo2 className="h-3.5 w-3.5" /> {c.resetLabel}
        </button>
      </header>

      <ol className="mt-4 space-y-2.5">
        {plan.tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            c={c}
            task={task}
            index={i}
            clock={formatClock(start + task.startOffsetMinutes, locale)}
            isLast={i === plan.tasks.length - 1}
            onMove={(dir) => onChange(move(plan.tasks, i, i + dir))}
            onToggleSkip={() =>
              onChange(
                plan.tasks.map((t) =>
                  t.id === task.id ? { ...t, status: t.status === "skipped" ? "planned" : "skipped" } : t,
                ),
              )
            }
            onRename={(title) =>
              onChange(plan.tasks.map((t) => (t.id === task.id ? { ...t, title } : t)))
            }
            onDuration={(minutes) =>
              onChange(plan.tasks.map((t) => (t.id === task.id ? { ...t, durationMinutes: minutes } : t)))
            }
          />
        ))}
      </ol>
    </section>
  );
}

function TaskRow({
  c, task, index, clock, isLast, onMove, onToggleSkip, onRename, onDuration,
}: {
  c: Copy; task: PlanTask; index: number; clock: string; isLast: boolean;
  onMove: (dir: number) => void; onToggleSkip: () => void;
  onRename: (title: string) => void; onDuration: (minutes: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  const Icon = CHANNEL_ICON[task.channel];
  const skipped = task.status === "skipped";

  return (
    <li
      className={`relative overflow-hidden rounded-[24px] border bg-card p-4 shadow-sm transition-all sm:p-5 ${
        skipped ? "border-dashed border-border/60 opacity-60" : "border-border/60"
      }`}
    >
      <div className="grid gap-3 sm:grid-cols-[5.5rem_auto_minmax(0,1fr)_auto] sm:items-start">
        <div className="flex items-center gap-2 sm:block">
          <span className="text-sm font-black tracking-tight text-foreground">{skipped ? "—" : clock}</span>
          <span className="block text-[11px] font-semibold text-muted-foreground">
            {task.durationMinutes > 0 ? `${task.durationMinutes} ${c.minutesShort}` : ""}
          </span>
        </div>

        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background text-primary"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <input
                autoFocus
                dir="auto"
                value={task.title}
                onChange={(e) => onRename(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
                aria-label="Task title"
                className="min-w-0 flex-1 rounded-xl bg-muted/50 px-3 py-1.5 text-sm font-bold outline-none"
              />
            ) : (
              <h3 dir="auto" className={`text-[17px] font-black sm:text-[18px] ${skipped ? "line-through" : ""}`}>
                {task.title}
              </h3>
            )}
          </div>

          {task.detail && <p dir="auto" className="mt-1 text-[16px] leading-relaxed text-muted-foreground">{task.detail}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {task.locationNote && (
              <span dir="auto" className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {task.locationNote}</span>
            )}
            {task.categorySlug && (
              <Link
                to="/services/$category"
                params={{ category: task.categorySlug }}
                className="font-bold text-primary hover:underline"
              >
                {c.findProLabel}
              </Link>
            )}
          </div>

          {/* Default card stays short and legible: only Edit shows. Duration,
              skip and reordering are mechanics, revealed on demand. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-bold hover:bg-muted"
            >
              {editing ? c.doneLabel : c.editLabel}
            </button>
          </div>

          {editing && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span>{c.durationLabel}</span>
                <input
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  value={task.durationMinutes}
                  onChange={(e) => onDuration(Math.max(0, Math.min(480, Number(e.target.value) || 0)))}
                  aria-label={`Duration in minutes for ${task.title}`}
                  className="w-16 rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold outline-none"
                />
                {c.minutesShort}
              </label>
              <button
                onClick={onToggleSkip}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold hover:bg-muted"
              >
                {skipped ? c.restoreLabel : c.skipLabel}
              </button>
              <button
                onClick={() => onMove(-1)}
                disabled={index === 0}
                aria-label={`Move ${task.title} earlier`}
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background disabled:opacity-30 hover:bg-muted"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onMove(1)}
                disabled={isLast}
                aria-label={`Move ${task.title} later`}
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background disabled:opacity-30 hover:bg-muted"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

    </li>
  );
}

/* ---------------- channels + notes ---------------- */

function PlanDetails({ plan }: { plan: GpbPlan }) {
  const c = uiCopy(plan);
  const used = new Set(plan.tasks.map((t) => t.channel));
  const channels = (Object.keys(CHANNEL_META) as ExecutionChannel[]).filter(
    (c) => used.has(c) && c !== "not-supported",
  );
  const hasFuture = channels.some((ch) => !CHANNEL_META[ch].live);
  // Channel blurbs and this caveat only exist in English; the localized versions
  // of the same disclaimers are already in plan.notes.
  const english = !plan.understanding || plan.understanding.languageCode.toLowerCase().startsWith("en");

  return (
    <section className="mt-6">
      {hasFuture && english && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Food, grocery and ride steps are planned partner services and aren't connected yet. Nothing here is
          booked or ordered.
        </p>
      )}

      <details className="group rounded-[24px] border border-border/60 bg-card p-5 shadow-sm">
        <summary dir="auto" className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black tracking-tight">
          {c.detailsHeading}
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition-transform group-open:rotate-90">
            <ArrowRight className="h-4 w-4" />
          </span>
        </summary>

        {/* Channel labels/blurbs only exist in English; on a localized plan the
            same information is already carried by the localized task titles and
            notes, so the grid is suppressed rather than shown in English. */}
        <div className={english ? "mt-4 grid gap-2 sm:grid-cols-2" : "hidden"}>
          {channels.map((c) => {
            const meta = CHANNEL_META[c];
            const Icon = CHANNEL_ICON[c];
            return (
              <div key={c} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight">
                    {meta.label}
                    {!meta.live && <span className="ml-2 text-[11px] font-bold text-muted-foreground">Coming soon</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>

        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          {plan.notes.map((n) => (
            <li key={n} dir="auto">· {n}</li>
          ))}
          {english && (
            <li>· Home and local tasks link into the GPB service catalogue, where you choose and book a pro.</li>
          )}
        </ul>
      </details>
    </section>
  );
}

function NextSteps({ c }: { c: Copy }) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link
        to="/snap"
        data-analytics-id="show_gpb_cta"
        data-analytics-location="plan_page"
        className="flex items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30"
      >
        <span>
          <span dir="auto" className="block text-sm font-black tracking-tight">{c.snapCtaTitle}</span>
          <span dir="auto" className="mt-1 block text-xs text-muted-foreground">{c.snapCtaBody}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      </Link>
      <a
        href="/#early-access"
        data-analytics-id="early_access_cta"
        data-analytics-location="plan_page"
        className="flex items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30"
      >
        <span>
          <span dir="auto" className="block text-sm font-black tracking-tight">{c.earlyCtaTitle}</span>
          <span dir="auto" className="mt-1 block text-xs text-muted-foreground">{c.earlyCtaBody}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      </a>
    </section>
  );
}
