import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };
const Ctx = createContext<ThemeCtx | null>(null);

const THEME_KEY = "getpros-theme";
/** Pre-rebrand keys, migrated once into THEME_KEY then deleted. */
const LEGACY_THEME_KEYS = ["gpb-theme", ["snap", "it-theme"].join("")];

function migrateLegacyTheme() {
  try {
    const ls = window.localStorage;
    for (const k of LEGACY_THEME_KEYS) {
      const v = ls.getItem(k);
      if (v !== null && ls.getItem(THEME_KEY) === null) ls.setItem(THEME_KEY, v);
      ls.removeItem(k);
    }
  } catch { /* storage unavailable */ }
}

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  migrateLegacyTheme();
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // GetPros is light-first: new visitors always start in light mode.
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const t = getInitial();
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try { window.localStorage.setItem(THEME_KEY, t); } catch {}
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) return { theme: "light" as Theme, toggle: () => {}, setTheme: () => {} };
  return ctx;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/70 text-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-muted " +
        className
      }
    >
      <Sun className={"h-4 w-4 transition-all " + (isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100")} />
      <Moon className={"absolute h-4 w-4 transition-all " + (isDark ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
    </button>
  );
}

/** Inline script (stringified) injected in <head> to avoid FOUC. */
export const themeInitScript = `
(function(){try{var s=localStorage.getItem('getpros-theme')||localStorage.getItem('gpb-theme')||localStorage.getItem('snap'+'it-theme');if(s==='dark')document.documentElement.classList.add('dark');}catch(e){}})();
`;