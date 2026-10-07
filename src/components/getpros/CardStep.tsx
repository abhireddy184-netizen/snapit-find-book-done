import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { formatCents } from "@/lib/pricing";

type Amounts = { subtotal_cents: number; service_fee_cents: number; total_cents: number };

export function CardStep(props: {
  clientSecret: string;
  publishableKey: string;
  amounts: Amounts;
  proName: string;
  onSaved: (setupIntentId: string) => Promise<void>;
}) {
  const stripePromise = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret, appearance: { theme: "stripe" } }}>
      <CardForm {...props} />
    </Elements>
  );
}

function CardForm({ amounts, proName, onSaved }: Parameters<typeof CardStep>[0]) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "https://getpros.ai/dashboard" },
    });
    if (err || !setupIntent) {
      setError(err?.message ?? "We couldn't save your card. Please try again.");
      setBusy(false);
      return;
    }
    await onSaved(setupIntent.id);
  };

  return (
    <div className="surface-card p-5 sm:p-6">
      <h2 className="text-xl font-black">Add a card</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You won't be charged now. We place a hold 2 days before the job and charge only after {proName} finishes and
        you approve (or 48 hours after completion).
      </p>
      <dl className="mt-4 space-y-1.5 rounded-xl border border-border p-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Job price</dt><dd>{formatCents(amounts.subtotal_cents)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Service fee</dt><dd>{formatCents(amounts.service_fee_cents)}</dd></div>
        <div className="flex justify-between border-t border-border pt-1.5 font-bold"><dt>Total</dt><dd>{formatCents(amounts.total_cents)}</dd></div>
      </dl>
      <div className="mt-4"><PaymentElement /></div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={busy || !stripe}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Save card and send request
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Free cancellation until 24 hours before the start. Later cancellations cost {formatCents(2500)}.
      </p>
    </div>
  );
}
