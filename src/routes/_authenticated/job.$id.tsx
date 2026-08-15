import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { useAuth } from "@/lib/auth";
import { providers } from "@/lib/snapit-data";
import { verifyJobCompletion } from "@/lib/verify-job.functions";
import {
  JOB_STATUS_STYLE,
  VERIFICATION_COPY,
  acceptQuote,
  fetchJob,
  fetchJobDocuments,
  fetchQuotes,
  jobStatusLabel,
  mediaAsDataUrl,
  money,
  quoteRangeVerdict,
  seedDemoQuotes,
  signedMediaUrl,
  updateJob,
  uploadJobMedia,
  type Job,
} from "@/lib/jobs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/job/$id")({
  head: () => ({
    meta: [
      { title: "Job passport — SnapIt" },
      { name: "description", content: "Your permanent record for this job: diagnosis, standardized scope, quotes, booking, verification and proof." },
      { property: "og:title", content: "Job passport — SnapIt" },
      { property: "og:description", content: "Diagnosis, scope, quotes, booking and before/after proof in one record." },
    ],
  }),
  component: JobPassport,
});

const FLOW = ["Snap", "Understand", "Scope", "Compare", "Book", "Verify", "Proof"];

function flowIndex(job: Job): number {
  switch (job.status) {
    case "diagnosed":
      return 2;
    case "quotes_requested":
      return 3;
    case "booked":
      return 4;
    case "in_progress":
      return 4;
    case "needs_verification":
      return 5;
    case "completed":
      return 6;
    default:
      return 1;
  }
}

function JobPassport() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const jobQ = useQuery({ queryKey: ["job", id], queryFn: () => fetchJob(id) });
  const quotesQ = useQuery({ queryKey: ["job-quotes", id], queryFn: () => fetchQuotes(id) });
  const docsQ = useQuery({ queryKey: ["job-docs", id], queryFn: () => fetchJobDocuments(id) });

  const job = jobQ.data ?? null;
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    void (async () => {
      const b = await signedMediaUrl(job?.before_image_path);
      const a = await signedMediaUrl(job?.after_image_path);
      if (!ok) return;
      setBeforeUrl(b);
      setAfterUrl(a);
    })();
    return () => {
      ok = false;
    };
  }, [job?.before_image_path, job?.after_image_path]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["job", id] });
    void qc.invalidateQueries({ queryKey: ["job-quotes", id] });
    void qc.invalidateQueries({ queryKey: ["job-docs", id] });
    void qc.invalidateQueries({ queryKey: ["jobs"] });
  };

  if (jobQ.isLoading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading job passport…
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center">
          <h1 className="text-lg font-black">Job not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This job may have been removed.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary">Back to dashboard</Link>
        </div>
      </AppShell>
    );
  }

  const step = flowIndex(job);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pt-2 animate-fade-in">
        <Link to="/dashboard" className="text-xs font-semibold text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{job.category_label}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${JOB_STATUS_STYLE[job.status]}`}>{jobStatusLabel(job.status)}</span>
          <span className="text-xs text-muted-foreground">Opened {new Date(job.created_at).toLocaleDateString()}</span>
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Job passport</h1>
        <p className="mt-1 text-sm text-muted-foreground">A permanent record of what was wrong, what was agreed, who did it and how it ended.</p>

        <FlowStrip step={step} />

        <BeforeAfter beforeUrl={beforeUrl} afterUrl={afterUrl} />

        <ScopeCard job={job} onSaved={invalidate} />

        <QuotesCard
          job={job}
          quotes={quotesQ.data ?? []}
          loading={quotesQ.isLoading}
          onChanged={invalidate}
        />

        <VerificationCard job={job} userId={user?.id} beforeUrl={beforeUrl} afterUrl={afterUrl} onChanged={invalidate} />

        <DocumentsCard job={job} docs={docsQ.data ?? []} userId={user?.id} onChanged={invalidate} />
      </div>
    </AppShell>
  );
}

function FlowStrip({ step }: { step: number }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex min-w-max items-center gap-2">
        {FLOW.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  done ? "bg-primary/10 text-primary" : active ? "text-white" : "bg-muted text-muted-foreground"
                }`}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
                {label}
              </div>
              {i < FLOW.length - 1 && <div className={`h-px w-4 ${done ? "bg-primary/40" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, action }: { title: string; icon: typeof ClipboardList; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-black">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BeforeAfter({ beforeUrl, afterUrl }: { beforeUrl: string | null; afterUrl: string | null }) {
  return (
    <Card title="Before & after" icon={Camera}>
      <div className="grid grid-cols-2 gap-3">
        <Frame label="Before" url={beforeUrl} empty="No before photo" />
        <Frame label="After" url={afterUrl} empty="Add an after photo when the work is done" />
      </div>
    </Card>
  );
}

function Frame({ label, url, empty }: { label: string; url: string | null; empty: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      {url ? (
        <img src={url} alt={`${label} photo`} className="aspect-square w-full rounded-2xl border border-border/60 object-cover" />
      ) : (
        <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-center text-[11px] text-muted-foreground">
          {empty}
        </div>
      )}
    </div>
  );
}

function ScopeCard({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(job.problem_statement);
  const [scope, setScope] = useState(job.scope_of_work.join("\n"));
  const [note, setNote] = useState(job.customer_note);
  const [low, setLow] = useState(String(job.expected_price_low));
  const [high, setHigh] = useState(String(job.expected_price_high));
  const [minutes, setMinutes] = useState(String(job.estimated_minutes));
  const [urgency, setUrgency] = useState(job.urgency);

  const save = async () => {
    setSaving(true);
    try {
      await updateJob(job.id, {
        problem_statement: problem,
        scope_of_work: scope.split("\n").map((s) => s.trim()).filter(Boolean),
        customer_note: note,
        expected_price_low: Number(low) || 0,
        expected_price_high: Number(high) || 0,
        estimated_minutes: Number(minutes) || 60,
        urgency,
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Standardized job scope"
      icon={ClipboardList}
      action={
        <button
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold hover:bg-muted"
        >
          {editing ? <><X className="h-3 w-3" /> Cancel</> : <><Pencil className="h-3 w-3" /> Edit</>}
        </button>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Every pro receives this exact scope, so quotes can be compared like for like.
      </p>

      {editing ? (
        <div className="space-y-3 text-sm">
          <Labelled label="Problem statement">
            <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} className="input-base" />
          </Labelled>
          <Labelled label="Recommended scope of work (one per line)">
            <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={5} className="input-base" />
          </Labelled>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Labelled label="Urgency">
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="input-base">
                {["low", "medium", "high", "emergency"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Labelled>
            <Labelled label="Minutes"><input value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input-base" /></Labelled>
            <Labelled label="Price low"><input value={low} onChange={(e) => setLow(e.target.value)} className="input-base" /></Labelled>
            <Labelled label="Price high"><input value={high} onChange={(e) => setHigh(e.target.value)} className="input-base" /></Labelled>
          </div>
          <Labelled label="Your note to the pro">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input-base" />
          </Labelled>
          <GradientButton onClick={save} className="w-full justify-center">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save scope
          </GradientButton>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <FieldLabel>Problem</FieldLabel>
            <p className="text-foreground/90">{job.problem_statement || "—"}</p>
          </div>
          <div>
            <FieldLabel>Scope of work</FieldLabel>
            <ul className="space-y-1.5">
              {job.scope_of_work.map((s) => (
                <li key={s} className="flex gap-2 text-foreground/90">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                </li>
              ))}
              {job.scope_of_work.length === 0 && <li className="text-muted-foreground">No scope items yet.</li>}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Urgency" value={job.urgency} />
            <MiniStat label="Est. time" value={`${job.estimated_minutes} min`} />
            <MiniStat label="Expected range" value={`${money(job.expected_price_low, job.currency)}–${money(job.expected_price_high, job.currency)}`} />
            <MiniStat label="Category" value={job.category_label} />
          </div>
          {job.safety_steps.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-3">
              <FieldLabel>Safety / temporary steps</FieldLabel>
              <ul className="space-y-1 text-xs text-amber-900">
                {job.safety_steps.map((s) => <li key={s}>• {s}</li>)}
              </ul>
            </div>
          )}
          {job.customer_note && (
            <div>
              <FieldLabel>Customer note</FieldLabel>
              <p className="text-foreground/90">{job.customer_note}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-bold capitalize">{value}</div>
    </div>
  );
}

function QuotesCard({
  job,
  quotes,
  loading,
  onChanged,
}: {
  job: Job;
  quotes: Awaited<ReturnType<typeof fetchQuotes>>;
  loading: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const pool = useMemo(() => {
    const inCat = providers.filter((p) => p.category === job.category_slug);
    const list = (inCat.length >= 3 ? inCat : [...inCat, ...providers]).slice(0, 3);
    return list.map((p, i) => ({
      name: p.name,
      availability: ["Today", "Tomorrow morning", "Within 3 days"][i] ?? "This week",
      warranty: ["90-day workmanship guarantee", "1-year parts & labour", "30-day callback guarantee"][i] ?? "30-day guarantee",
    }));
  }, [job.category_slug]);

  const request = async () => {
    setBusy(true);
    try {
      await seedDemoQuotes(job, pool);
      await updateJob(job.id, { status: "quotes_requested" });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const accept = async (quoteId: string, providerName: string) => {
    setBusy(true);
    try {
      await acceptQuote(job.id, quoteId);
      onChanged();
      await navigate({
        to: "/book",
        search: { job: job.id, service: job.category_label, pro: providerName } as never,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Compare quotes"
      icon={Sparkles}
      action={
        quotes.length === 0 ? (
          <button
            onClick={request}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Request quotes
          </button>
        ) : null
      }
    >
      {loading && <div className="text-sm text-muted-foreground">Loading quotes…</div>}
      {!loading && quotes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No quotes yet. Requesting quotes sends this exact scope to pros. Until real pros are onboarded, sample quotes are
          generated so you can try the comparison view.
        </p>
      )}
      {quotes.length > 0 && (
        <>
          <div className="mb-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            Demo data — sample quotes generated against your scope. Real pro submissions land here once providers are onboarded.
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quotes.map((q) => {
              const verdict = quoteRangeVerdict(Number(q.price), Number(job.expected_price_low), Number(job.expected_price_high));
              const accepted = q.status === "accepted";
              return (
                <div
                  key={q.id}
                  className={`flex flex-col rounded-2xl border p-4 shadow-sm ${accepted ? "border-primary bg-primary/5" : "border-border/60 bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-black">{q.provider_name_snapshot}</div>
                    {q.is_demo && <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Demo</span>}
                  </div>
                  <div className="mt-2 text-2xl font-black">{money(q.price, q.currency)}</div>
                  <span className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${verdict.tone}`}>{verdict.label}</span>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {q.earliest_availability}
                  </div>
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {q.warranty}
                  </div>
                  <ul className="mt-3 space-y-1 text-[11px] text-foreground/80">
                    {q.included_work.map((w) => <li key={w}>• {w}</li>)}
                  </ul>
                  <div className="mt-auto pt-4">
                    {accepted ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><CheckCircle2 className="h-4 w-4" /> Accepted</div>
                    ) : (
                      <button
                        onClick={() => accept(q.id, q.provider_name_snapshot)}
                        disabled={busy || q.status === "declined"}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                      >
                        {q.status === "declined" ? "Declined" : <>Accept & book <ArrowRight className="h-3 w-3" /></>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function VerificationCard({
  job,
  userId,
  beforeUrl,
  afterUrl,
  onChanged,
}: {
  job: Job;
  userId: string | undefined;
  beforeUrl: string | null;
  afterUrl: string | null;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const verify = useServerFn(verifyJobCompletion);
  const copy = VERIFICATION_COPY[job.verification_status];

  const onFile = async (file: File) => {
    if (!userId) return;
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      const path = await uploadJobMedia(userId, dataUrl, "after");
      await updateJob(job.id, {
        after_image_path: path,
        status: job.status === "completed" ? "completed" : "needs_verification",
        verification_status: "not_started",
      });
      await supabase.from("job_documents").insert({
        job_id: job.id,
        customer_id: userId,
        kind: "after_photo",
        title: "After photo",
        storage_path: path,
      });
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const runCheck = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const before = await mediaAsDataUrl(job.before_image_path);
      const after = await mediaAsDataUrl(job.after_image_path);
      if (!before || !after) throw new Error("Both a before and an after photo are needed.");
      const verdict = await verify({
        data: { beforeImage: before, afterImage: after, scope: job.scope_of_work.join("; ") || job.problem_statement },
      });
      await updateJob(job.id, {
        verification_status: verdict.result,
        verification_note: [verdict.summary, ...verdict.observations.map((o) => `• ${o}`)].join("\n"),
        verified_at: new Date().toISOString(),
        status: verdict.result === "appears_completed" ? "completed" : job.status,
        completed_at: verdict.result === "appears_completed" ? new Date().toISOString() : job.completed_at,
      });
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "The visual check could not run.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Before & after verification" icon={ScanLine}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${copy.tone}`}>{copy.label}</span>
        <span className="text-[11px] text-muted-foreground">AI visual check — not a professional inspection.</span>
      </div>

      {job.verification_note && (
        <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-muted/40 p-3 text-xs text-foreground/90">{job.verification_note}</pre>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" /> {afterUrl ? "Replace after photo" : "Add after photo"}
        </button>
        <button
          onClick={runCheck}
          disabled={busy || !beforeUrl || !afterUrl}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Run AI visual check
        </button>
      </div>
      {msg && <p className="mt-3 text-xs text-destructive">{msg}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">
        The AI compares your before and after photos against the agreed scope and returns a conservative result. Always confirm
        the work yourself before signing off.
      </p>
    </Card>
  );
}

function DocumentsCard({
  job,
  docs,
  userId,
  onChanged,
}: {
  job: Job;
  docs: Awaited<ReturnType<typeof fetchJobDocuments>>;
  userId: string | undefined;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [warranty, setWarranty] = useState(job.warranty_notes ?? "");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!userId || !title.trim()) return;
    setBusy(true);
    try {
      await supabase.from("job_documents").insert({
        job_id: job.id,
        customer_id: userId,
        kind: "receipt",
        title: title.trim(),
        external_url: url.trim() || null,
      });
      setTitle("");
      setUrl("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (docId: string) => {
    await supabase.from("job_documents").delete().eq("id", docId);
    onChanged();
  };

  const saveWarranty = async () => {
    setBusy(true);
    try {
      await updateJob(job.id, { warranty_notes: warranty });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Receipts, warranty & proof" icon={FileText}>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-semibold">{d.title || d.kind}</span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] uppercase text-muted-foreground">{d.kind.replace("_", " ")}</span>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
            <button onClick={() => void remove(d.id)} aria-label="Remove document" className="shrink-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents attached yet.</p>}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Receipt or document name" className="input-base" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" className="input-base" />
        <button onClick={add} disabled={busy || !title.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4">
        <FieldLabel>Warranty / guarantee notes</FieldLabel>
        <textarea value={warranty} onChange={(e) => setWarranty(e.target.value)} rows={2} className="input-base" placeholder="e.g. 90-day workmanship guarantee agreed with the pro" />
        <button onClick={saveWarranty} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60">
          <CheckCircle2 className="h-3.5 w-3.5" /> Save warranty note
        </button>
      </div>
    </Card>
  );
}