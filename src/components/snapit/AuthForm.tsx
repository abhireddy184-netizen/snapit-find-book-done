import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { User, Briefcase, Mail, Lock, ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { GradientButton } from "./AppShell";
import { cn } from "@/lib/utils";

type Role = "customer" | "provider";

export function AuthForm({
  mode,
  title,
  subtitle,
  footer,
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  footer: ReactNode;
}) {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("customer");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-2">
        <aside className="relative hidden overflow-hidden p-10 text-white md:block" style={{ background: "var(--gradient-primary)" }}>
          <Logo />
          <div className="mt-24">
            <h2 className="text-4xl font-black leading-tight">Snap it.<br />Book it.<br />Done.</h2>
            <p className="mt-4 max-w-sm text-white/90">Join thousands of customers and pros using SnapIt every day to get things done.</p>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </aside>

        <main className="flex flex-col justify-center px-6 py-10 md:px-12">
          <div className="mb-6 md:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            <RoleTab active={role === "customer"} onClick={() => setRole("customer")} icon={User} label="Customer" />
            <RoleTab active={role === "provider"} onClick={() => setRole("provider")} icon={Briefcase} label="Service Provider" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {role === "customer" ? "Continue as Customer — book trusted local pros." : "Continue as Service Provider — grow your business."}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: role === "provider" ? "/provider-dashboard" : "/dashboard" });
            }}
            className="mt-6 space-y-3"
          >
            {mode === "register" && <Field icon={User} placeholder="Full name" />}
            <Field icon={Mail} placeholder="Email address" type="email" />
            <Field icon={Lock} placeholder="Password" type="password" />

            <GradientButton type="submit" className="mt-2 w-full">
              {mode === "login" ? "Log in" : "Create account"} <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SocialBtn label="Google" />
            <SocialBtn label="Apple" />
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function RoleTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        active ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Field({ icon: Icon, placeholder, type = "text" }: { icon: React.ComponentType<{ className?: string }>; placeholder: string; type?: string }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input type={type} required placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
  );
}

function SocialBtn({ label }: { label: string }) {
  return (
    <button type="button" className="rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted">
      {label}
    </button>
  );
}