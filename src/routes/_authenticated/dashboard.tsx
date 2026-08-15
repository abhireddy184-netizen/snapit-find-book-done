import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Heart, MessageCircle, User, MapPin, Star, ShieldCheck, Camera, LogOut, Loader2 } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";
import { useAuth } from "@/lib/auth";
import { fetchCustomerBookings, formatBookingDate, type Booking } from "@/lib/bookings";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
      <div className="rounded-3xl border border-border/60 bg-card p-10 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: "var(--gradient-primary)" }}>
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
  confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function BookingCard({ booking }: { booking: Booking }) {
  const name = booking.provider_name_snapshot || "Pro to be assigned";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Avatar initials={initials} gradient="from-blue-500 to-purple-600" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{booking.service}</div>
          <div className="truncate text-xs text-muted-foreground">
            {name} · {formatBookingDate(booking.scheduled_date)} · {booking.scheduled_time}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle[booking.status] ?? "bg-muted"}`}>
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
      <DemoNote>Sample pros shown for demo browsing — saved lists become real once providers join SnapIt.</DemoNote>
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
    </div>
  );
}

function Messages() {
  return (
    <div>
      <DemoNote>Messaging is not live yet — this is a sample preview of the inbox.</DemoNote>
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
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} gradient="from-blue-500 to-purple-600" size={64} />
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
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
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
