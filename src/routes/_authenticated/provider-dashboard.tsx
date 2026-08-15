import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DollarSign, CalendarDays, Star, MessageCircle, User, Wrench, TrendingUp, Check, X } from "lucide-react";
import { AppShell, Avatar } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";

export const Route = createFileRoute("/_authenticated/provider-dashboard")({
  head: () => ({
    meta: [
      { title: "Provider dashboard — SnapIt" },
      { name: "description", content: "Manage jobs, appointments, availability and earnings on SnapIt." },
      { property: "og:title", content: "Provider dashboard — SnapIt" },
      { property: "og:description", content: "Manage your SnapIt business in one place." },
    ],
  }),
  component: ProviderDashboard,
});

const tabs = [
  { id: "requests", label: "Requests", icon: Wrench },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "services", label: "Services", icon: DollarSign },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

function ProviderDashboard() {
  const [tab, setTab] = useState("requests");
  return (
    <AppShell>
      <div className="pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black md:text-3xl">Rivera Plumbing Co.</h1>
            <p className="mt-1 text-sm text-muted-foreground">You have 3 new job requests today.</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="This week" value="$1,240" delta="+18%" icon={DollarSign} />
        <Stat label="Jobs done" value="24" delta="+4" icon={Check} />
        <Stat label="Rating" value="4.9" delta="⭐" icon={Star} />
        <Stat label="Response" value="12 min" delta="Fast" icon={TrendingUp} />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "requests" && <Requests />}
        {tab === "schedule" && <Schedule />}
        {tab === "services" && <Services />}
        {tab === "reviews" && <Reviews />}
        {tab === "messages" && <Msgs />}
        {tab === "profile" && <ProviderProfile />}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: "var(--gradient-primary)" }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-semibold text-emerald-600">{delta}</div>
      </div>
    </div>
  );
}

const jobRequests = [
  { name: "Sofia Chen", job: "Kitchen sink leak", when: "In 2 hours", price: "$120", initials: "SC", gradient: "from-blue-500 to-purple-600" },
  { name: "Ben Rivera", job: "Water heater install", when: "Tomorrow", price: "$650", initials: "BR", gradient: "from-fuchsia-500 to-purple-600" },
  { name: "Ada Kimura", job: "Toilet running constantly", when: "Fri afternoon", price: "$95", initials: "AK", gradient: "from-indigo-500 to-violet-600" },
];

function Requests() {
  return (
    <div className="space-y-3">
      {jobRequests.map((r) => (
        <div key={r.name} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <Avatar initials={r.initials} gradient={r.gradient} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{r.name}</div>
              <div className="truncate text-xs text-muted-foreground">{r.job} · {r.when}</div>
            </div>
            <div className="shrink-0 text-sm font-bold text-primary">{r.price}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-full border border-border py-2 text-xs font-semibold hover:bg-muted"><X className="mr-1 inline h-3.5 w-3.5" /> Decline</button>
            <button className="flex-1 rounded-full py-2 text-xs font-semibold text-white shadow-sm" style={{ background: "var(--gradient-primary)" }}><Check className="mr-1 inline h-3.5 w-3.5" /> Accept</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Schedule() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="text-sm font-bold">This week</div>
      <div className="mt-4 space-y-2">
        {["Mon 9:00 AM · Sofia C. — Leak repair", "Tue 11:00 AM · Ben R. — Water heater", "Wed 2:00 PM · Ada K. — Toilet", "Fri 3:30 PM · Marco L. — Drain unclog"].map((s) => (
          <div key={s} className="rounded-xl border border-border/60 px-4 py-3 text-sm">{s}</div>
        ))}
      </div>
      <div className="mt-6 border-t border-border/60 pt-4">
        <div className="text-sm font-bold">Availability</div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <button key={i} className={`rounded-lg py-2 font-semibold ${i < 5 ? "bg-primary/10 text-primary" : "border border-border text-muted-foreground"}`}>{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Services() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
      {providers[0].services.map((s) => (
        <div key={s.name} className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-bold">{s.name}</div>
            <div className="text-xs text-muted-foreground">Standard visit</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-primary">{s.price}</div>
            <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  return (
    <div className="space-y-3">
      {providers[0].reviewList.map((r) => (
        <div key={r.name} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.date}</div>
          </div>
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
        </div>
      ))}
    </div>
  );
}

function Msgs() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
      {jobRequests.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3 p-4">
          <Avatar initials={r.initials} gradient={r.gradient} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-bold">{r.name}</div>
              <div className="shrink-0 text-[10px] text-muted-foreground">{["3m", "1h", "Yesterday"][i]}</div>
            </div>
            <div className="truncate text-xs text-muted-foreground">{["What time can you come?", "Any photos of the model?", "Thanks, see you tomorrow."][i]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProviderProfile() {
  const p = providers[0];
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar initials={p.initials} gradient={p.gradient} size={64} />
        <div>
          <div className="text-lg font-bold">{p.name}</div>
          <div className="text-xs text-muted-foreground">{p.business}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{p.bio}</p>
      <div className="mt-4 flex gap-2">
        <button className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Edit profile</button>
        <button className="flex-1 rounded-full py-2 text-sm font-semibold text-white" style={{ background: "var(--gradient-primary)" }}>Preview public</button>
      </div>
    </div>
  );
}