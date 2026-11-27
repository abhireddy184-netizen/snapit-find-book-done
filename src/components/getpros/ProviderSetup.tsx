import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Loader2, Save, Send, ShieldCheck } from "lucide-react";
import {
  getMyProviderSetup,
  saveMyProviderSetup,
  submitMyProviderSetup,
} from "@/lib/provider-setup.functions";
import { ensureProviderOnboardingEmail } from "@/lib/provider-profile.functions";
import {
  missingSetupItems,
  type SetupDraft,
} from "@/lib/provider-setup-rules";
import { catalog } from "@/lib/catalog";
import { useAuth } from "@/lib/auth";
import { ProviderDocuments } from "./ProviderDocuments";
import { Button } from "@/components/ui/button";

const emptyDraft: SetupDraft = {
  full_name: "",
  phone: "",
  business_name: "",
  business_type: "individual",
  category_slugs: [],
  service_slugs: [],
  service_area: "",
  service_zip: "",
  service_radius_miles: null,
  bio: "",
  trade_license_required: false,
  other_service_description: "",
};

export function ProviderSetup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getMyProviderSetup);
  const save = useServerFn(saveMyProviderSetup);
  const submit = useServerFn(submitMyProviderSetup);
  const welcome = useServerFn(ensureProviderOnboardingEmail);
  const state = useQuery({
    queryKey: ["provider-setup", user?.id],
    queryFn: () => load(),
    enabled: Boolean(user),
  });
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [otherSelected, setOtherSelected] = useState(false);
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    const data = state.data;
    if (!data || initializedFor.current === data.userId) return;
    initializedFor.current = data.userId;
    const s = data.setup;
    const p = data.provider;
    const priorCategory = catalog.find((c) => c.name === p?.service_category);
    setDraft({
      ...emptyDraft,
      full_name: s?.full_name || data.profile.full_name,
      phone: s?.phone || p?.phone || data.profile.phone || "",
      business_name: p?.business_name || "",
      business_type:
        s?.business_type === "registered_business" ? "registered_business" : "individual",
      category_slugs: s?.category_slugs.length
        ? s.category_slugs
        : priorCategory
          ? [priorCategory.slug]
          : [],
      service_slugs: s?.service_slugs || [],
      service_area: p?.service_area || "",
      service_zip: p?.service_zip || "",
      service_radius_miles: p?.service_radius_miles || null,
      bio: p?.bio || "",
      trade_license_required: s?.trade_license_required || false,
      other_service_description: s?.other_service_description || "",
    });
    setOtherSelected(Boolean(s?.other_service_description?.trim()));
    void welcome({ data: undefined }).catch(() => {});
  }, [state.data, welcome]);

  async function persist(final: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    setMissing([]);
    // An unchecked "Other services" box never sends leftover text.
    const payload: SetupDraft = {
      ...draft,
      other_service_description: otherSelected ? (draft.other_service_description ?? "").trim() : "",
    };
    try {
      if (final) {
        const items = missingSetupItems(payload, [], { otherSelected });
        if (items.length) {
          setMissing(items);
          return;
        }
      }
      await save({ data: payload });
      if (final) setMessage("Draft saved. Submission is not complete until confirmation appears.");
      if (final) {
        const result = await submit();
        if (!result.submitted) {
          setMissing(result.missing);
          return;
        }
        setMessage("");
        await qc.invalidateQueries({ queryKey: ["provider-setup", user?.id] });
      } else setMessage("Draft saved. Return to this page whenever you are ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your setup.");
    } finally {
      setBusy(false);
    }
  }

  if (state.isLoading)
    return (
      <p className="flex items-center gap-2 py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved setup…
      </p>
    );
  if (state.error)
    return (
      <p role="alert" className="py-8 text-destructive">
        {state.error.message}
      </p>
    );
  const pending =
    state.data?.setup?.state === "under_verification" ||
    state.data?.provider?.verification_status === "pending";
  const approved = state.data?.provider?.verification_status === "verified";
  if (pending || approved)
    return (
      <section className="mx-auto max-w-2xl py-12">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <h1 className="mt-5 text-3xl font-black">
          {approved ? "Your profile is approved" : "Your profile is under verification"}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {approved
            ? "Manage your business and set up payouts in your dashboard before taking paid bookings."
            : "Your profile has been received. The GetPros team is reviewing your submission. Approval is a separate admin decision and does not confirm identity, licensing or insurance."}
        </p>
        <Button asChild className="mt-6 min-h-11">
          <Link to="/provider-dashboard">Open dashboard</Link>
        </Button>
      </section>
    );

  const set = <K extends keyof SetupDraft>(key: K, value: SetupDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <main className="mx-auto max-w-3xl pb-12 pt-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <CheckCircle2 className="h-4 w-4" /> Pending Setup
      </div>
      <h1 className="mt-3 text-3xl font-black">Complete your Pro setup</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your profile stays private and unbookable until GetPros approves it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void persist(true);
        }}
        className="mt-7 space-y-0"
      >
        <SetupSection title="Contact details" open>
          <div className="grid gap-4 sm:grid-cols-2">
            <SetupInput
              label="Name"
              value={draft.full_name}
              onChange={(v) => set("full_name", v)}
            />
            <SetupInput
              label="Phone number"
              value={draft.phone}
              type="tel"
              onChange={(v) => set("phone", v)}
            />
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Verified email
            <input
              type="email"
              readOnly
              value={state.data?.email || ""}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-muted px-3 font-normal"
            />
          </label>
        </SetupSection>
        <SetupSection title="Services" open>
          <div className="space-y-3">
            {catalog.map((category) => (
              <details
                key={category.slug}
                className="border-b border-border pb-3"
                open={draft.category_slugs.includes(category.slug) || undefined}
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {category.name}{" "}
                  {draft.category_slugs.includes(category.slug) && (
                    <span className="text-primary">✓</span>
                  )}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {category.services.map((service) => (
                    <label key={service.slug} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                        checked={draft.service_slugs.includes(service.slug)}
                        onChange={(e) =>
                          setDraft((d) => {
                            const services = e.target.checked
                              ? [...d.service_slugs, service.slug]
                              : d.service_slugs.filter((s) => s !== service.slug);
                            return {
                              ...d,
                              service_slugs: services,
                              category_slugs: catalog
                                .filter((c) => c.services.some((s) => services.includes(s.slug)))
                                .map((c) => c.slug),
                            };
                          })
                        }
                      />
                      {service.name}
                    </label>
                  ))}
                </div>
              </details>
            ))}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={otherSelected}
                  onChange={(e) => setOtherSelected(e.target.checked)}
                />
                Other Services
                {otherSelected && (draft.other_service_description ?? "").trim() && (
                  <span className="text-primary">✓</span>
                )}
              </label>
              <p className="ml-6 mt-1 text-xs text-muted-foreground">
                Offer something not listed above? Tell us about it.
              </p>
              {otherSelected && (
                <label className="ml-6 mt-3 block text-sm font-semibold">
                  Describe your service
                  <input
                    type="text"
                    value={draft.other_service_description ?? ""}
                    onChange={(e) => set("other_service_description", e.target.value)}
                    maxLength={300}
                    placeholder="e.g. Home tutoring, online classes, teaching assistant"
                    className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              )}
            </div>
          </div>
        </SetupSection>
        <SetupSection title="Service area" open>
          <div className="grid gap-4 sm:grid-cols-2">
            <SetupInput
              label="Service city"
              value={draft.service_area}
              onChange={(v) => set("service_area", v)}
            />
            <SetupInput
              label="5-digit US ZIP"
              value={draft.service_zip}
              onChange={(v) => set("service_zip", v.replace(/\D/g, "").slice(0, 5))}
            />
            <SetupInput
              label="Service radius (miles)"
              type="number"
              value={draft.service_radius_miles?.toString() || ""}
              onChange={(v) => set("service_radius_miles", v ? Number(v) : null)}
            />
          </div>
        </SetupSection>
        <SetupSection title="Business details" open>
          <label className="block text-sm font-semibold">
            Business type
            <select
              className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3"
              value={draft.business_type}
              onChange={(e) =>
                set(
                  "business_type",
                  e.target.value === "registered_business" ? "registered_business" : "individual",
                )
              }
            >
              <option value="individual">Independent professional</option>
              <option value="registered_business">Registered business</option>
            </select>
          </label>
          <div className="mt-4">
            <SetupInput
              label="Business or professional name"
              value={draft.business_name}
              onChange={(v) => set("business_name", v)}
            />
          </div>
          <label className="mt-4 block text-sm font-semibold">
            About your work
            <textarea
              className="mt-2 w-full rounded-md border border-input bg-background p-3 font-normal"
              rows={3}
              maxLength={4000}
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </label>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
              checked={draft.trade_license_required}
              onChange={(e) => set("trade_license_required", e.target.checked)}
            />
            <span>
              A trade license applies to the services I offer. Requirements depend on your work and
              location; GetPros will review applicable documents.
            </span>
          </label>
        </SetupSection>
        <SetupSection title="Optional private documents · Documentos privados opcionales">
          <p className="mb-4 text-sm text-muted-foreground">
            No documents are required to submit your basic profile for review. You may optionally
            upload credentials here. Any license or insurance needed for a specific service must be
            addressed before doing that work. Do not upload government photo IDs or email documents.
          </p>
          <p lang="es" className="mb-4 text-sm text-muted-foreground">
            No se requieren documentos para enviar tu perfil básico a revisión. Si quieres, puedes
            subir tus credenciales aquí. Debes cumplir con los requisitos de licencia o seguro de cada
            servicio antes de realizar ese trabajo. No subas identificaciones oficiales con foto ni
            envíes documentos por correo electrónico.
          </p>
          <ProviderDocuments userId={user?.id} unified />
        </SetupSection>
        {missing.length > 0 && (
          <div role="alert" className="py-5 text-sm text-destructive">
            <p className="font-semibold">Still needed before submission:</p>
            <ul className="mt-2 list-inside list-disc">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="py-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="py-4 text-sm text-primary">
            {message}
          </p>
        )}
        <div className="flex flex-col gap-3 py-6 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 flex-1"
            disabled={busy}
            onClick={() => void persist(false)}
          >
            <Save /> Save draft
          </Button>
          <Button type="submit" className="min-h-12 flex-1" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit for verification
          </Button>
        </div>
      </form>
    </main>
  );
}

function SetupSection({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="border-t border-border py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-bold">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
function SetupInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={300}
        className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
