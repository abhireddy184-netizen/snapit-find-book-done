import { Check, Circle } from "lucide-react";
import { passwordChecklist } from "@/lib/password-policy";

/** Live, accessible password requirement checklist (never colour-only). */
export function PasswordChecklist({ value }: { value: string }) {
  const items = passwordChecklist(value);
  const metCount = items.filter((i) => i.met).length;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Password requirements
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs font-medium">
            {item.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-mint-ink" aria-hidden />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className={item.met ? "text-mint-ink" : "text-muted-foreground"}>{item.label}</span>
            <span className="sr-only">{item.met ? "requirement met" : "requirement not met"}</span>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {metCount} of {items.length} password requirements met.
      </p>
    </div>
  );
}
