import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "gp-install-dismissed-at";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Small, dismissible install card shown briefly when the site opens. */
export function InstallPromptBanner() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [help, setHelp] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < SNOOZE_MS) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t1 = setTimeout(() => setShow(true), 1500);
    const t2 = setTimeout(() => setShow(false), 20000);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show) return null;

  const dismiss = () => { localStorage.setItem(KEY, String(Date.now())); setShow(false); };
  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      dismiss();
      return;
    }
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
      setHelp("In Safari, tap Share, then Add to Home Screen.");
    else if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) setHelp("In Safari, choose File → Add to Dock.");
    else setHelp("Open your browser menu (⋮) and choose Install app.");
  };

  return (
    <div
      role="dialog"
      aria-label="Install GetPros app"
      className="fade-up fixed inset-x-3 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-3.5 text-foreground shadow-elevated sm:inset-x-auto sm:right-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <div className="flex items-start gap-3">
        <img src="/icon-192.png?v=gp6" alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border/60" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Get the GetPros app</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{help ?? "Add it to your home screen or desktop in one tap."}</p>
          {!help && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Download className="h-4 w-4" /> Install
            </button>
          )}
        </div>
        <button type="button" aria-label="Close" onClick={dismiss} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
