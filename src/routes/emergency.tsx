import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, PhoneCall, Zap, Droplet, Flame, Wind, Lock, Car, Clock, ShieldCheck, Star } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "24/7 Emergency Services — GetPros" },
      { name: "description", content: "Burst pipe, no power, no heat or lockout? Tell GetPros what happened and we will route your urgent request to emergency pros." },
      { property: "og:title", content: "24/7 Emergency Services — GetPros" },
      { property: "og:description", content: "Send an urgent service request to GetPros emergency pros." },
    ],
  }),
  component: EmergencyPage,
});

const emergencyTypes = [
  { slug: "plumbing", label: "Burst pipe / flood", icon: Droplet, color: "from-[#2FA8C0] to-[#3AA6F0]" },
  { slug: "electrical", label: "Power outage / sparks", icon: Zap, color: "from-amber-500 to-orange-500" },
  { slug: "hvac", label: "No heat / no AC", icon: Wind, color: "from-[#2FA8C0] to-[#4C86C6]" },
  { slug: "handyman", label: "Broken lock / door", icon: Lock, color: "from-rose-500 to-red-500" },
  { slug: "appliance-repair", label: "Gas leak / smoke", icon: Flame, color: "from-red-500 to-orange-600" },
  { slug: "auto-services", label: "Roadside / breakdown", icon: Car, color: "from-[#4C86C6] to-[#2F4E96]" },
];

function EmergencyPage() {
  const emergencyPros = providers.slice(0, 3);
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              <ShieldAlert className="h-3.5 w-3.5" /> 24/7 Emergency dispatch
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Something urgent?{" "}
              <span className="text-red-600">We're on it.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
              Tell us what happened and we will route your urgent request to on-call pros for the most common home emergencies. Response times depend on pro availability in your area.
            </p>
          </div>
          <Link
            to="/snap"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-4 text-base font-bold text-white shadow-elevated hover:bg-red-700"
          >
            <PhoneCall className="h-5 w-5" /> Request emergency help
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black">What's happening?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {emergencyTypes.map((t) => (
            <Link
              key={t.slug}
              to="/snap"
              className="group flex items-center gap-3 surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-elevated"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-card`}>
                <t.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{t.label}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Urgent request
                </div>
              </div>
              <span className="text-xs font-semibold text-red-600 opacity-0 transition-opacity group-hover:opacity-100">Start →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-black">Example emergency pro profiles</h2>
        <p className="mt-1 text-xs text-muted-foreground">Example profiles shown for illustration — not live availability.</p>
        <div className="mt-4 space-y-3">
          {emergencyPros.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 surface-card p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <Avatar initials={p.initials} gradient={p.gradient} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-bold">{p.name}</div>
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">{p.business}</div>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-bold uppercase tracking-wide text-muted-foreground">
                  Example profile
                </span>
              </div>
              <Link to="/provider/$id" params={{ id: p.id }}>
                <GradientButton>View profile</GradientButton>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <strong>Life-threatening emergency?</strong> Call 911 immediately. GetPros routes requests to trade professionals, not first responders.
      </div>
    </AppShell>
  );
}