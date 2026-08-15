import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { searchPlaces, formatPlace, formatPlaceShort, type ZipPlace } from "@/lib/us-zip";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks a suggestion. */
  onSelect?: (place: ZipPlace) => void;
  /** "zip" keeps the stored value as 5 numeric digits (provider forms). */
  mode?: "text" | "zip";
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  fieldClassName?: string;
  showIcon?: boolean;
  required?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  mode = "text",
  placeholder = "ZIP or city (e.g. 75034)",
  className,
  inputClassName,
  fieldClassName,
  showIcon = true,
  required,
  id,
  ...rest
}: Props) {
  const listId = useId();
  const [items, setItems] = useState<ZipPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const raw = value.trim();
    if (raw.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      void searchPlaces(raw, 5).then((next) => {
        if (!alive) return;
        setItems(next);
        setActive(-1);
        setLoading(false);
        if (touched) setOpen(true);
      });
    }, 140);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [value, touched]);

  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  function choose(place: ZipPlace) {
    skipRef.current = true;
    onChange(mode === "zip" ? place.zip : formatPlace(place));
    onSelect?.(place);
    setOpen(false);
    setItems([]);
  }

  const digits = value.replace(/[^0-9]/g, "");
  const invalidZip =
    touched && !loading && /^\d{5}$/.test(value.trim()) && items.length === 0 && digits.length === 5;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <label className={cn("flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3", fieldClassName)}>
        {showIcon && <MapPin className="h-4 w-4 shrink-0 text-primary" />}
        <input
          id={id}
          value={value}
          required={required}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode={mode === "zip" ? "numeric" : "text"}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          {...rest}
          onChange={(e) => {
            const raw = e.target.value;
            setTouched(true);
            onChange(mode === "zip" ? raw.replace(/[^0-9]/g, "").slice(0, 5) : raw);
          }}
          onFocus={() => {
            setTouched(true);
            if (items.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i + 1) % items.length);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && items[active]) {
                e.preventDefault();
                choose(items[active]!);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            inputClassName,
          )}
        />
        {loading && value.trim().length >= 2 && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </label>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-auto rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl"
        >
          {items.map((p, i) => (
            <li key={p.zip} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-primary/10 text-foreground" : "hover:bg-muted/70",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-semibold">{formatPlaceShort(p)}</span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">{p.zip}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {invalidZip && (
        <p className="mt-1 text-xs font-medium text-destructive">
          {value.trim()} isn’t a recognized US ZIP code.
        </p>
      )}
    </div>
  );
}
