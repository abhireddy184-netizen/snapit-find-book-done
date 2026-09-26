import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Bookmark, MessageCircle, User, MapPin, Star, ShieldCheck, Camera, LogOut, Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";
import { useAuth } from "@/lib/auth";
import { fetchCustomerBookings, formatBookingDate, type Booking } from "@/lib/bookings";
import { JOB_STATUS_FLOW, JOB_STATUS_STYLE, fetchJobs, jobStatusLabel, money, type Job, type JobStatus } from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — GetPros" },
      { name: "description", content: "Manage your bookings, messages and saved pros on GetPros." },
      { property: "og:title", content: "Your dashboard — GetPros" },
      { property: "og:description", content: "Bookings, messages and saved pros — all in one place." },
    ],
  }),
  component: Dashboard,
});

const tabs = [
  { id: "jobs", label: "Jobs", icon: ClipboardList },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

function Dashboard() {
  const [tab, setTab] = useState("jobs");
  const { profile, user } = useAuth();
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";

  return (
    <AppShell>
      <div className="pt-4">
        <h1 className="text-2xl font-black md:text-3xl">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your bookings.</p>
        {profile?.role === "provider" && (
          <Link to="/provider-dashboard" className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">
            Switch to provider dashboard
          </Link>
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
        {tab === "jobs" && <Jobs userId={user?.id} />}
        {tab === "bookings" && <Bookings userId={user?.id} />}
        {tab === "saved" && <Saved />}
        {tab === "messages" && <Messages />}
        {tab === "profile" && <Profile />}
      </div>
    </AppShell>
  );
}

function DemoNote({ children }: { children: string }) {
  return (
    <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{children}</div>
  );
}

function Jobs({ userId }: { userId: string | undefined }) {
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs", userId],
    queryFn: () => fetchJobs(userId as string),
    enabled: Boolean(userId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your jobs…
      </div>
    );
  }
  if (error) {
    return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">We couldn't load your jobs. Please refresh and try again.</div>;
  }

  const jobs = data ?? [];
  const shown = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  if (jobs.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: "var(--primary)" }}>
          <Camera className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-black">No jobs yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Snap a problem and we'll turn the diagnosis into a standardized scope you can send to pros — then keep the proof here.
        </p>
        <div className="mt-5 flex justify-center">
          <Link to="/snap"><GradientButton>Snap a Problem</GradientButton></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "all" as const, label: "All" }, ...JOB_STATUS_FLOW].map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id as JobStatus | "all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No jobs with this status yet.</p>
      ) : (
        <div className="space-y-3">{shown.map((j) => <JobCard key={j.id} job={j} />)}</div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      to="/job/$id"
      params={{ id: job.id }}
      className="block surface-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{job.category_label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${JOB_STATUS_STYLE[job.status]}`}>{jobStatusLabel(job.status)}</span>
        <span className="ml-auto text-xs text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{job.problem_statement}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/80">
          {money(job.expected_price_low, job.currency)}–{money(job.expected_price_high, job.currency)}
        </span>
        <span>{job.estimated_minutes} min</span>
        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary">Open passport <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
  );
}

function Bookings({ userId }: { userId: string | undefined }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings", "customer", userId],
    queryFn: () => fetchCustomerBookings(userId as string),
    enabled: Boolean(userId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your bookings…
      </div>
    );
  }
  if (error) {
    return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">We couldn't load your bookings. Please refresh and try again.</div>;
  }

  const bookings = data ?? [];
  if (bookings.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: "var(--primary)" }}>
          <Camera className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-black">No bookings yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Snap a photo of your problem and we'll match you with a local pro in seconds.</p>
        <div className="mt-5 flex justify-center">
          <Link to="/snap"><GradientButton>Snap a Problem</GradientButton></Link>
        </div>
      </div>
    );
  }

  const active = bookings.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_progress");
  const past = bookings.filter((b) => !active.includes(b));

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <div>
          <h2 className="text-lg font-black">Upcoming</h2>
          <div className="mt-3 space-y-3">{active.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-black">Previous</h2>
          <div className="mt-3 space-y-3">{past.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
        </div>
      )}
    </div>
  );
}

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-mint/25 text-mint-ink",
  in_progress: "bg-sky/25 text-sky-ink",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function BookingCard({ booking }: { booking: Booking }) {
  const name = booking.provider_name_snapshot || "Pro to be assigned";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="surface-card p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Avatar initials={initials} gradient="from-[#2C5CA8] to-[#2FA8C0]" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{booking.service}</div>
          <div className="truncate text-xs text-muted-foreground">
            {name} · {formatBookingDate(booking.scheduled_date)} · {booking.scheduled_time}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[booking.status] ?? "bg-muted"}`}>
          {booking.status.replace("_", " ")}
        </span>
      </div>
      {booking.details && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{booking.details}</p>}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{booking.service_address}</span>
      </div>
    </div>
  );
}

function Saved() {
  return (
    <div>
      <DemoNote>Sample pros shown for demo browsing — saved lists become real once providers join GetPros.</DemoNote>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.slice(0, 4).map((p) => (
          <Link key={p.id} to="/provider/$id" params={{ id: p.id }} className="surface-card p-4 hover:shadow-card">
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
    </div>
  );
}

function Messages() {
  return (
    <div>
      <DemoNote>Messaging is not live yet — this is a sample preview of the inbox.</DemoNote>
      <div className="surface-card divide-y divide-border/60">
        {providers.slice(0, 4).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 p-4">
            <Avatar initials={p.initials} gradient={p.gradient} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="shrink-0 text-xs text-muted-foreground">{["Now", "2m", "1h", "Yesterday"][i]}</div>
              </div>
              <div className="truncate text-xs text-muted-foreground">{["I'm on my way!", "Sounds good, see you at 11.", "Thanks for booking.", "Job complete — please rate!"][i]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name || user?.email || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="surface-card p-6">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} gradient="from-[#2C5CA8] to-[#2FA8C0]" size={64} />
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{profile?.full_name || "Your account"}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <Field label="Account type" value={profile?.role === "provider" ? "Service provider" : "Customer"} />
          <Field label="Member since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" }) : "—"} />
        </div>
        <button
          onClick={async () => {
            await signOut();
            await navigate({ to: "/" });
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
      <div className="surface-card p-6">
        <div className="text-sm font-bold">Saved addresses</div>
        <p className="mt-2 text-xs text-muted-foreground">Address book is coming soon. For now, you enter the service address with each booking.</p>
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
