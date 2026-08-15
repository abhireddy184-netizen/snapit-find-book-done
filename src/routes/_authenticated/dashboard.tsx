import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Heart, MessageCircle, User, MapPin, Star, ShieldCheck } from "lucide-react";
import { AppShell, Avatar } from "@/components/snapit/AppShell";
import { providers, type Provider } from "@/lib/snapit-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — SnapIt" },
      { name: "description", content: "Manage your bookings, messages and saved pros on SnapIt." },
      { property: "og:title", content: "Your dashboard — SnapIt" },
      { property: "og:description", content: "Bookings, messages and saved pros — all in one place." },
    ],
  }),
  component: Dashboard,
});

const tabs = [
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "saved", label: "Saved", icon: Heart },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

function Dashboard() {
  const [tab, setTab] = useState("bookings");
  return (
    <AppShell>
      <div className="pt-4">
        <h1 className="text-2xl font-black md:text-3xl">Welcome back, Jamie</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your bookings.</p>
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
        {tab === "bookings" && <Bookings />}
        {tab === "saved" && <Saved />}
        {tab === "messages" && <Messages />}
        {tab === "profile" && <Profile />}
      </div>
    </AppShell>
  );
}

function Bookings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black">Upcoming</h2>
        <div className="mt-3 space-y-3">
          {providers.slice(0, 2).map((p, i) => (
            <BookingCard key={p.id} provider={p} status={i === 0 ? "confirmed" : "pending"} when={i === 0 ? "Tomorrow · 11:00 AM" : "Fri · 3:30 PM"} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-black">Previous</h2>
        <div className="mt-3 space-y-3">
          {providers.slice(2, 5).map((p) => (
            <BookingCard key={p.id} provider={p} status="completed" when="Sep 12 · 2:00 PM" />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ provider: p, status, when }: { provider: Provider; status: "confirmed" | "pending" | "completed"; when: string }) {
  const badgeStyle = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-muted text-muted-foreground",
  }[status];
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Avatar initials={p.initials} gradient={p.gradient} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{p.name}</div>
          <div className="truncate text-xs text-muted-foreground">{p.business} · {when}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${badgeStyle}`}>{status}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to="/provider/$id" params={{ id: p.id }} className="flex-1 rounded-full border border-border py-2 text-center text-xs font-semibold hover:bg-muted">View</Link>
        <button className="flex-1 rounded-full py-2 text-center text-xs font-semibold text-white shadow-sm" style={{ background: "var(--gradient-primary)" }}>Message</button>
      </div>
    </div>
  );
}

function Saved() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {providers.slice(0, 4).map((p) => (
        <Link key={p.id} to="/provider/$id" params={{ id: p.id }} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md">
          <div className="flex items-center gap-3">
            <Avatar initials={p.initials} gradient={p.gradient} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <div className="truncate text-sm font-bold">{p.name}</div>
                {p.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </div>
              <div className="truncate text-xs text-muted-foreground">{p.business}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}</span>
            <span className="font-semibold text-primary">from ${p.startingPrice}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Messages() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
      {providers.slice(0, 4).map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 p-4">
          <Avatar initials={p.initials} gradient={p.gradient} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-bold">{p.name}</div>
              <div className="shrink-0 text-[10px] text-muted-foreground">{["Now", "2m", "1h", "Yesterday"][i]}</div>
            </div>
            <div className="truncate text-xs text-muted-foreground">{["I'm on my way!", "Sounds good, see you at 11.", "Thanks for booking.", "Job complete — please rate!"][i]}</div>
          </div>
          {i < 2 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
      ))}
    </div>
  );
}

function Profile() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar initials="JM" gradient="from-blue-500 to-purple-600" size={64} />
          <div>
            <div className="text-lg font-bold">Jamie Morgan</div>
            <div className="text-xs text-muted-foreground">jamie@snapit.example</div>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <Field label="Phone" value="+1 (555) 010-2244" />
          <Field label="Member since" value="March 2024" />
          <Field label="Preferred payment" value="Visa ending in 4242" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="text-sm font-bold">Saved addresses</div>
        <div className="mt-3 space-y-2">
          {[
            { label: "Home", addr: "123 Maple Ave, Springfield" },
            { label: "Work", addr: "500 Market St, Suite 12" },
          ].map((a) => (
            <div key={a.label} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="truncate text-xs text-muted-foreground">{a.addr}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}