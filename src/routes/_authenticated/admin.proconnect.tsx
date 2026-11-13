import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, ShieldAlert, PhoneOff, PhoneCall, RefreshCw, Plus, FlaskConical, Ban, CheckCircle2, CircleDashed, ChevronDown, Lock } from "lucide-react";
import { AppShell, GradientButton } from "@/components/getpros/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { catalog, getCategoryBySlug } from "@/lib/catalog";
import {
  DFW_CITIES, LEAD_STATUSES, STATUS_LABEL, CALL_OUTCOMES, OUTCOME_LABEL, COMPLIANCE_ITEMS, TELEPHONY_CONNECTED,
  activationReadiness, computeMetrics, simulationBlockReason, buildScript, simulateTranscript,
  type CallOutcome, type ComplianceKey, type LeadStatus,
} from "@/lib/proconnect";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"proconnect_leads">;
type CallLog = Tables<"proconnect_call_logs">;
type Settings = Tables<"proconnect_settings">;

export const Route = createFileRoute("/_authenticated/admin/proconnect")({
  head: () => ({
    meta: [
      { title: "ProConnect AI Calling Agent — GetPros admin" },
      { name: "description", content: "Admin-only Pro recruitment leads, consent, do-not-call and call history for GetPros ProConnect." },
      { property: "og:title", content: "ProConnect AI Calling Agent — GetPros admin" },
      { property: "og:description", content: "Admin-only Pro recruitment tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProConnectPage,
});

const catName = (slug: string) => getCategoryBySlug(slug)?.name ?? slug;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong.");

function ProConnectPage() {
  const { user } = useAuth();
  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("is_admin")).data === true,
  });
  if (isAdmin.isLoading || !user) return <AppShell><Center><Loader2 className="h-5 w-5 animate-spin" /></Center></AppShell>;
  if (!isAdmin.data)
    return (
      <AppShell>
        <Center>
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-bold">This page is for GetPros admins only.</p>
          <Link to="/" className="mt-3 text-sm font-semibold text-primary">Back to home</Link>
        </Center>
      </AppShell>
    );
  return <AppShell><Dashboard /></AppShell>;
}

function Dashboard() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [city, setCity] = useState("all");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [showDemo, setShowDemo] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);

  const leads = useQuery({
    queryKey: ["proconnect-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proconnect_leads").select("*").order("created_at", { ascending: false }).order("business_name");
      if (error) throw error;
      return data as Lead[];
    },
  });
  const settings = useQuery({
    queryKey: ["proconnect-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proconnect_settings").select("*").maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const all = leads.data ?? [];
  const metrics = useMemo(() => computeMetrics(all), [all]);
  const filtered = all.filter((l) =>
    (showDemo || !l.is_demo) && (city === "all" || l.city === city) && (cat === "all" || l.category_slug === cat) && (status === "all" || l.status === status),
  );
  const cities = Array.from(new Set([...DFW_CITIES, ...all.map((l) => l.city)]));
  const refresh = () => qc.invalidateQueries({ queryKey: ["proconnect-leads"] });

  async function sync() {
    setSyncing(true); setMsg(null);
    const { data, error } = await supabase.rpc("proconnect_sync_leads");
    setSyncing(false);
    if (error) return setMsg({ kind: "err", text: error.message });
    const r = data as { imported: number; converted: number };
    setMsg({ kind: "ok", text: `Imported ${r.imported} new lead(s) from Join-as-a-Pro forms; ${r.converted} lead(s) matched to a Pro signup.` });
    refresh();
  }

  return (
    <div className="mx-auto max-w-5xl py-4">
      <Link to="/admin/providers" className="text-sm font-semibold text-primary">← Approve pros</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-black">GetPros ProConnect</h1>
        <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-bold text-secondary">AI Calling Agent</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground"><FlaskConical className="h-3.5 w-3.5" /> Simulation mode</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Track Dallas–Fort Worth Pro recruitment leads, consent and do-not-call status. No calls are placed from this page.</p>
      {msg && <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.kind === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}

      <IntegrationCard settings={settings.data ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ["proconnect-settings"] })} />

      <section aria-label="Metrics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Real leads" value={metrics.real} hint={`${metrics.demo} demo`} />
        <Stat label="Consented" value={metrics.consented} />
        <Stat label="Do not call" value={metrics.doNotCall} />
        <Stat label="Follow-ups due" value={metrics.followUpsDue} />
        <Stat label="Contacted" value={metrics.contacted} />
        <Stat label="Interested" value={metrics.interested} />
        <Stat label="Signed up" value={metrics.signedUp} />
        <Stat label="Signup conversion" value={`${metrics.conversionRate}%`} hint="real leads only" />
      </section>

      <section className="mt-6 surface-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="City" value={city} onChange={setCity} options={[["all", "All DFW cities"], ...cities.map((c) => [c, c] as [string, string])]} />
          <Select label="Category" value={cat} onChange={setCat} options={[["all", "All categories"], ...catalog.map((c) => [c.slug, c.name] as [string, string])]} />
          <Select label="Status" value={status} onChange={setStatus} options={[["all", "All statuses"], ...LEAD_STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])]} />
          <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} className="h-4 w-4" /> Show demo leads
          </label>
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <button onClick={sync} disabled={syncing} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted sm:flex-none">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Pro signups
            </button>
            <GradientButton onClick={() => setAdding((v) => !v)} className="flex-1 sm:flex-none"><Plus className="h-4 w-4" /> Add lead</GradientButton>
          </div>
        </div>
        {adding && <AddLeadForm onDone={(ok) => { setAdding(false); if (ok) { setMsg({ kind: "ok", text: "Lead added." }); refresh(); } }} />}
      </section>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">Leads ({filtered.length})</h2>
      {leads.isLoading && <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>}
      {leads.error && <p className="mt-2 text-sm text-destructive">{errMsg(leads.error)}</p>}
      <div className="mt-2 space-y-3">
        {!leads.isLoading && filtered.length === 0 && <p className="surface-card p-4 text-sm text-muted-foreground">No leads match these filters.</p>}
        {filtered.map((l) => <LeadCard key={l.id} lead={l} onChanged={refresh} />)}
      </div>
    </div>
  );
}

function IntegrationCard({ settings, onSaved }: { settings: Settings | null; onSaved: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const readiness = activationReadiness(settings);
  async function toggle(key: ComplianceKey, value: boolean) {
    setSaving(key);
    const patch: Partial<Record<ComplianceKey, boolean>> & { updated_at: string } = { updated_at: new Date().toISOString() };
    patch[key] = value;
    await supabase.from("proconnect_settings").update(patch).eq("id", true);
    setSaving(null);
    onSaved();
  }
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="surface-card p-4">
        <div className="flex items-center gap-2">
          <PhoneOff className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-black">Phone / voice provider</h2>
          <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{TELEPHONY_CONNECTED ? "Connected" : "Not connected"}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">No calling service is integrated. Autodialing is off and cannot be turned on here.</p>
        <div className="mt-3 space-y-2">
          {[["Voice provider", "Not configured"], ["Caller ID number", "Not configured"], ["Call status webhook", "Not configured"]].map(([k, v]) => (
            <label key={k} className="block text-xs font-semibold text-muted-foreground">{k}
              <input disabled value={v} readOnly className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm" />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">A developer sets these up only after an authorized provider is chosen and compliance is signed off.</p>
      </div>
      <div className="surface-card p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-black">Compliance before activation</h2>
        </div>
        <ul className="mt-3 space-y-1">
          {COMPLIANCE_ITEMS.map((item) => (
            <li key={item.key}>
              <label className="flex min-h-11 items-start gap-2 py-1 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" disabled={!settings || saving === item.key}
                  checked={!!settings?.[item.key]} onChange={(e) => toggle(item.key, e.target.checked)} />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <button disabled className="mt-3 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground">
          <PhoneCall className="h-4 w-4" /> Activate AI calling — locked
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Still needed: {readiness.missing.join("; ")}.</p>
      </div>
    </section>
  );
}

function LeadCard({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const blocked = simulationBlockReason(lead);
  return (
    <div className="surface-card p-4">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-black">{lead.business_name}</span>
            {lead.is_demo && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">DEMO</span>}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{STATUS_LABEL[lead.status as LeadStatus] ?? lead.status}</span>
            {lead.do_not_call
              ? <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive"><Ban className="h-3 w-3" /> DNC</span>
              : lead.consent_status === "granted"
                ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"><CheckCircle2 className="h-3 w-3" /> Consent</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground"><CircleDashed className="h-3 w-3" /> No consent</span>}
          </div>
          <div className="mt-0.5 text-muted-foreground">{[lead.contact_name, catName(lead.category_slug), lead.city, lead.preferred_language === "es" ? "Español" : "English"].filter(Boolean).join(" · ")}</div>
          {lead.next_follow_up_at && !lead.do_not_call && <div className="text-xs text-muted-foreground">Follow up {new Date(lead.next_follow_up_at).toLocaleString()}</div>}
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <LeadDetail lead={lead} blocked={blocked} onChanged={onChanged} />}
    </div>
  );
}

function LeadDetail({ lead, blocked, onChanged }: { lead: Lead; blocked: string | null; onChanged: () => void }) {
  const qc = useQueryClient();
  const [lang, setLang] = useState<"en" | "es">(lead.preferred_language === "es" ? "es" : "en");
  const [outcome, setOutcome] = useState<CallOutcome>("interested");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const vars = { contactName: lead.contact_name, businessName: lead.business_name, category: catName(lead.category_slug), city: lead.city };

  const logs = useQuery({
    queryKey: ["proconnect-logs", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proconnect_call_logs").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CallLog[];
    },
  });
  const done = () => { qc.invalidateQueries({ queryKey: ["proconnect-logs", lead.id] }); onChanged(); };

  async function update(patch: Partial<Lead>) {
    setBusy(true); setErr(null);
    const { error } = await supabase.from("proconnect_leads").update(patch).eq("id", lead.id);
    setBusy(false);
    if (error) return setErr(error.message);
    onChanged();
  }
  async function addLog(kind: "simulation" | "manual_note") {
    setBusy(true); setErr(null);
    const isSim = kind === "simulation";
    const { error } = await supabase.from("proconnect_call_logs").insert({
      lead_id: lead.id, kind, language: lang,
      outcome: isSim ? outcome : "note",
      summary: isSim ? simulateTranscript(lang, vars, outcome) : note.trim(),
      follow_up_at: followUp ? new Date(followUp).toISOString() : null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setNote(""); setFollowUp("");
    done();
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
      {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 text-muted-foreground">
          {lead.phone && <div>Phone: {lead.phone}</div>}
          {lead.email && <div className="break-all">Email: {lead.email}</div>}
          <div>Source: {lead.source === "provider_interest" ? "Join-as-a-Pro form" : lead.source === "demo" ? "Demo data" : "Added by admin"}</div>
          {lead.consent_at && <div>Consent recorded {new Date(lead.consent_at).toLocaleDateString()}{lead.consent_source ? ` (${lead.consent_source})` : ""}</div>}
          {lead.opted_out_at && <div className="text-destructive">Opted out {new Date(lead.opted_out_at).toLocaleDateString()}</div>}
          {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
        </div>
        <div className="space-y-2">
          <Select label="Status" value={lead.status} onChange={(v) => update({ status: v })} disabled={busy || lead.do_not_call}
            options={LEAD_STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])} />
          {!lead.do_not_call && lead.consent_status !== "granted" && (
            <button disabled={busy} onClick={() => {
              const src = window.prompt("How was call consent obtained? (e.g. signed form, recorded verbal consent)");
              if (src && src.trim()) update({ consent_status: "granted", consent_source: src.trim().slice(0, 200) });
            }} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 font-semibold hover:bg-muted">
              <CheckCircle2 className="h-4 w-4" /> Record consent
            </button>
          )}
          {!lead.do_not_call && (
            <button disabled={busy} onClick={() => { if (window.confirm("Add to do-not-call? This can't be undone from this page.")) update({ do_not_call: true }); }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-4 font-semibold text-destructive hover:bg-destructive/10">
              <Ban className="h-4 w-4" /> Mark do-not-call / opted out
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-bold">Script preview</h3>
          <div className="ml-auto inline-flex rounded-full border border-border p-0.5" role="group" aria-label="Script language">
            {(["en", "es"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`min-h-9 rounded-full px-3 text-xs font-bold ${lang === l ? "bg-foreground text-background" : ""}`}>{l === "en" ? "English" : "Español"}</button>
            ))}
          </div>
        </div>
        <ol className="mt-2 list-decimal space-y-1 rounded-xl bg-muted/50 p-3 pl-7">
          {buildScript(lang, vars).map((line, i) => <li key={i}>{line}</li>)}
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <h3 className="flex items-center gap-1.5 font-bold"><FlaskConical className="h-4 w-4" /> Simulated call</h3>
          <p className="mt-1 text-xs text-muted-foreground">Writes a pretend transcript to history. Nobody is called.</p>
          <div className="mt-2">
            <Select label="Pretend outcome" value={outcome} onChange={(v) => setOutcome(v as CallOutcome)} options={CALL_OUTCOMES.map((o) => [o, OUTCOME_LABEL[o]] as [string, string])} />
          </div>
          {blocked
            ? <p className="mt-2 text-xs font-semibold text-destructive">Blocked: {blocked}</p>
            : <GradientButton disabled={busy} onClick={() => addLog("simulation")} className="mt-2 w-full">Run simulation</GradientButton>}
        </div>
        <div className="rounded-xl border border-border p-3">
          <h3 className="font-bold">Note & follow-up</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder="e.g. Met at supply store, prefers email"
            className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <label className="mt-2 block text-xs font-semibold text-muted-foreground">Follow up on
            <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} disabled={lead.do_not_call}
              className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" />
          </label>
          <button disabled={busy || (!note.trim() && !followUp)} onClick={() => addLog("manual_note")}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-4 font-semibold hover:bg-muted disabled:opacity-50">Save note</button>
        </div>
      </div>

      <div>
        <h3 className="font-bold">Call history</h3>
        {logs.isLoading && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
        {logs.data?.length === 0 && <p className="mt-1 text-muted-foreground">No activity yet.</p>}
        <ul className="mt-2 space-y-2">
          {logs.data?.map((log) => (
            <li key={log.id} className="rounded-xl bg-muted/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className={log.kind === "simulation" ? "text-secondary" : ""}>{log.kind === "simulation" ? "SIMULATION" : "NOTE"}</span>
                <span>{OUTCOME_LABEL[log.outcome as CallOutcome | "note"] ?? log.outcome}</span>
                <span className="font-normal text-muted-foreground">{new Date(log.created_at).toLocaleString()} · {log.language.toUpperCase()}</span>
              </div>
              {log.summary && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{log.summary}</p>}
              {log.follow_up_at && <p className="mt-1 text-xs">Follow-up: {new Date(log.follow_up_at).toLocaleString()}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AddLeadForm({ onDone }: { onDone: (ok: boolean) => void }) {
  const [f, setF] = useState({ business_name: "", contact_name: "", phone: "", email: "", category_slug: catalog[0]?.slug ?? "handyman", city: DFW_CITIES[0] as string, preferred_language: "en" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.business_name.trim()) return setErr("Business name is required.");
    setBusy(true); setErr(null);
    const { error } = await supabase.from("proconnect_leads").insert({
      business_name: f.business_name.trim().slice(0, 160), contact_name: f.contact_name.trim().slice(0, 120) || null,
      phone: f.phone.trim().slice(0, 40) || null, email: f.email.trim().slice(0, 200) || null,
      category_slug: f.category_slug, city: f.city, preferred_language: f.preferred_language, source: "manual",
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone(true);
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
      <Input label="Business name *" value={f.business_name} onChange={set("business_name")} />
      <Input label="Contact name" value={f.contact_name} onChange={set("contact_name")} />
      <Input label="Phone" value={f.phone} onChange={set("phone")} type="tel" />
      <Input label="Email" value={f.email} onChange={set("email")} type="email" />
      <Select label="Category" value={f.category_slug} onChange={set("category_slug")} options={catalog.map((c) => [c.slug, c.name] as [string, string])} />
      <Select label="City" value={f.city} onChange={set("city")} options={DFW_CITIES.map((c) => [c, c] as [string, string])} />
      <Select label="Language" value={f.preferred_language} onChange={set("preferred_language")} options={[["en", "English"], ["es", "Español"]]} />
      <p className="text-xs text-muted-foreground sm:col-span-2">New leads start with no call consent. Record consent before any call activity.</p>
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <GradientButton type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save lead</GradientButton>
        <button type="button" onClick={() => onDone(false)} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">Cancel</button>
      </div>
    </form>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="surface-card p-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-muted-foreground">{label}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-h-11 w-full max-w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">{label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={200}
        className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
    </label>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center">{children}</div>;
}
