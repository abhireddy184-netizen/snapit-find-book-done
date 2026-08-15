import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, User, Wrench, Check, X, Loader2, MapPin, LogOut, ShieldAlert, Inbox } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchProviderBookings, fetchMyProviderProfile, formatBookingDate, type Booking } from "@/lib/bookings";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/lib/snapit-data";

export const Route = createFileRoute("/_authenticated/provider-dashboard")({
  head: () => ({
    meta: [
      { title: "Provider dashboard — SnapIt" },
      { name: "description", content: "Manage jobs, appointments, availability and your provider profile on SnapIt." },
      { property: "og:title", content: "Provider dashboard — SnapIt" },
      { property: "og:description", content: "Manage your SnapIt business in one place." },
    ],
  }),
  component: ProviderDashboard,
});

const tabs = [
  { id: "requests", label: "Requests", icon: Wrench },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "profile", label: "Business profile", icon: User },
];

function ProviderDashboard() {
  const [tab, setTab] = useState("requests");
  const { user, profile } = useAuth();
  return (
    <AppShell>
      <div className="pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black md:text-3xl">{profile?.full_name || "Your business"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage incoming job requests and your business profile.</p>
          </div>
        </div>
        {profile && profile.role !== "provider" && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your account is registered as a customer. You can still set up a business profile below, or head to your{" "}
              <Link to="/dashboard" className="font-semibold underline">customer dashboard</Link>.
            </span>
          </div>
        )}
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
        {tab === "requests" && <Requests userId={user?.id} />}
        {tab === "schedule" && <Schedule userId={user?.id} />}
        {tab === "profile" && <BusinessProfile />}
      </div>
    </AppShell>
  );
}

function useProviderBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "provider", userId],
    queryFn: () => fetchProviderBookings(userId as string),
    enabled: Boolean(userId),
  });
}

function EmptyJobs({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: "var(--gradient-primary)" }}>
        <Inbox className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Requests({ userId }: { userId: string | undefined }) {
  const { data, isLoading, error } = useProviderBookings(userId);
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: "confirmed" | "cancelled") {
    setBusyId(id);
    await supabase.from("bookings").update({ status }).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["bookings", "provider", userId] });
    setBusyId(null);
  }

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox />;

  const bookings = (data ?? []).filter((b) => b.status === "pending");
  if (bookings.length === 0) {
    return <EmptyJobs title="No job requests yet" body="When a customer books you on SnapIt, their request will appear here for you to accept or decline." />;
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <JobRow booking={b} />
          <div className="mt-3 flex gap-2">
            <button
              disabled={busyId === b.id}
              onClick={() => setStatus(b.id, "cancelled")}
              className="flex-1 rounded-full border border-border py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              <X className="mr-1 inline h-3.5 w-3.5" /> Decline
            </button>
            <button
              disabled={busyId === b.id}
              onClick={() => setStatus(b.id, "confirmed")}
              className="flex-1 rounded-full py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Check className="mr-1 inline h-3.5 w-3.5" /> Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function JobRow({ booking }: { booking: Booking }) {
  return (
    <>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Avatar initials={booking.service.slice(0, 2).toUpperCase()} gradient="from-blue-500 to-purple-600" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{booking.service}</div>
          <div className="truncate text-xs text-muted-foreground">
            {formatBookingDate(booking.scheduled_date)} · {booking.scheduled_time}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold capitalize">{booking.status.replace("_", " ")}</span>
      </div>
      {booking.details && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{booking.details}</p>}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{booking.service_address}</span>
      </div>
    </>
  );
}

function Schedule({ userId }: { userId: string | undefined }) {
  const { data, isLoading, error } = useProviderBookings(userId);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox />;
  const upcoming = (data ?? []).filter((b) => b.status === "confirmed" || b.status === "in_progress");
  if (upcoming.length === 0) {
    return <EmptyJobs title="Nothing scheduled" body="Accepted jobs will show up here with the date, time and service address." />;
  }
  return (
    <div className="space-y-3">
      {upcoming.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <JobRow booking={b} />
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function ErrorBox() {
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Something went wrong loading your jobs. Please refresh.</div>;
}

function BusinessProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["provider-profile", user?.id],
    queryFn: () => fetchMyProviderProfile(user?.id as string),
    enabled: Boolean(user?.id),
  });

  const [form, setForm] = useState({
    business_name: "",
    service_category: "",
    service_area: "",
    starting_price: "",
    availability: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      business_name: data.business_name ?? "",
      service_category: data.service_category ?? "",
      service_area: data.service_area ?? "",
      starting_price: data.starting_price != null ? String(data.starting_price) : "",
      availability: data.availability ?? "",
      bio: data.bio ?? "",
    });
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setMessage(null);
    if (form.business_name.trim().length < 2) {
      setError("Please enter your business name.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      business_name: form.business_name.trim(),
      service_category: form.service_category || null,
      service_area: form.service_area || null,
      starting_price: form.starting_price ? Number(form.starting_price) : null,
      availability: form.availability || null,
      bio: form.bio || null,
    };
    const { error: upsertError } = await supabase.from("provider_profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setMessage("Business profile saved.");
    await queryClient.invalidateQueries({ queryKey: ["provider-profile", user.id] });
  }

  if (isLoading) return <Loading />;

  const verified = data?.verification_status === "verified";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form onSubmit={save} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-black">Business profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">This is what customers will see once provider listings go live.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} placeholder="Rivera Plumbing Co." />
          <Select label="Service category" value={form.service_category} onChange={(v) => setForm({ ...form, service_category: v })} />
          <Input label="Service area" value={form.service_area} onChange={(v) => setForm({ ...form, service_area: v })} placeholder="Springfield & nearby" />
          <Input label="Starting price ($)" value={form.starting_price} onChange={(v) => setForm({ ...form, starting_price: v.replace(/[^0-9.]/g, "") })} placeholder="89" />
          <Input label="Availability" value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} placeholder="Mon–Fri, 8am–6pm" />
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About your business</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={5}
            placeholder="Tell customers what you do and why they can trust you."
            className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
        {message && <p className="mt-3 text-xs font-medium text-emerald-600">{message}</p>}

        <div className="mt-5">
          <GradientButton type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save profile"}
          </GradientButton>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="text-sm font-bold">Verification</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold capitalize">
            <span className={`h-2 w-2 rounded-full ${verified ? "bg-emerald-500" : "bg-amber-500"}`} />
            {data?.verification_status ?? "unverified"}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            All new providers start unverified. Manual review by the SnapIt team is coming soon — until then no badge is shown to customers.
          </p>
        </div>
        <button
          onClick={async () => {
            await signOut();
            await navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">Select a category</option>
        {categories.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}
