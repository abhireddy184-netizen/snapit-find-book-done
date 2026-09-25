import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Footer "Install app" — native prompt on Chrome/Edge/Android, instructions on iPhone/Safari. */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<null | "ios" | "mac" | "other">(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
      return;
    }
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) setHelp("ios");
    else if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) setHelp("mac");
    else setHelp("other");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Install GetPros app
      </button>
      {help && (
        <div role="dialog" aria-label="How to install" className="mt-3 max-w-xs rounded-2xl border border-border bg-card p-4 text-xs text-foreground shadow-lg">
          <div className="mb-1 flex items-center justify-between">
            <strong>Install GetPros</strong>
            <button type="button" aria-label="Close" onClick={() => setHelp(null)} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {help === "ios" && <p>In Safari, tap <b>Share</b> then <b>Add to Home Screen</b>.</p>}
          {help === "mac" && <p>In Safari, choose <b>File → Add to Dock</b>.</p>}
          {help === "other" && <p>Open your browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</p>}
        </div>
      )}
    </div>
  );
}
