import { useMemo, useRef, useState } from "react";
import { Mail } from "lucide-react";

const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
];

/** Suggestions for a partially typed address. Never forces a public domain. */
export function emailSuggestions(value: string, limit = 4): string[] {
  const raw = value.trim();
  if (!raw || raw.includes(" ")) return [];
  const at = raw.indexOf("@");
  const local = at === -1 ? raw : raw.slice(0, at);
  if (local.length < 2) return [];
  const domainPart = at === -1 ? "" : raw.slice(at + 1).toLowerCase();

  // Already a complete, valid-looking custom address: nothing to suggest.
  if (domainPart.includes(".") && !COMMON_DOMAINS.some((d) => d.startsWith(domainPart) && d !== domainPart)) {
    return [];
  }

  return COMMON_DOMAINS.filter((d) => d.startsWith(domainPart) && d !== domainPart)
    .slice(0, limit)
    .map((d) => `${local}@${d}`);
}

export function EmailField({
  value,
  onChange,
  placeholder = "Email address",
  id,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestions = useMemo(() => (focused ? emailSuggestions(value) : []), [focused, value]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <label className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={value}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => setFocused(false), 140);
          }}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setFocused(false);
                }}
                className="block w-full truncate px-4 py-2.5 text-left text-sm hover:bg-muted"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
