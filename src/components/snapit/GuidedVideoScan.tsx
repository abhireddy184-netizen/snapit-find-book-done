import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

const MIN_SECONDS = 5;
const MAX_SECONDS = 10;

/** Short hints, keyed by elapsed seconds. No technical explanations. */
function hintFor(sec: number) {
  if (sec < 2) return "Show the full area";
  if (sec < 5) return "Move slowly";
  if (sec < 8) return "Move closer";
  return "Almost done";
}

export function canUseGuidedScan() {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

/**
 * Full-screen 5–10 second guided video scan. Records with the rear camera and
 * hands back a real video File; the existing frame extraction does the rest.
 */
export function GuidedVideoScan({
  onDone,
  onCancel,
  onUnsupported,
}: {
  onDone: (file: File) => void;
  onCancel: () => void;
  onUnsupported: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const [state, setState] = useState<"starting" | "ready" | "recording" | "complete">("starting");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setState("ready");
      })
      .catch(() => alive && onUnsupported());
    return () => {
      alive = false;
      try { recRef.current?.state === "recording" && recRef.current.stop(); } catch { /* noop */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => {
      const s = (Date.now() - startRef.current) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS) stop();
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const start = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const types = ["video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t));
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      return onUnsupported();
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setState("complete");
      const ext = type.includes("mp4") ? "mp4" : "webm";
      setTimeout(() => onDone(new File([blob], `scan.${ext}`, { type })), 600);
    };
    recRef.current = rec;
    startRef.current = Date.now();
    setElapsed(0);
    rec.start(500);
    setState("recording");
  };

  const stop = () => {
    const rec = recRef.current;
    if (rec && rec.state === "recording") rec.stop();
  };

  const pct = Math.min(100, (elapsed / MAX_SECONDS) * 100);
  const canFinish = elapsed >= MIN_SECONDS;
  const hint =
    state === "complete" ? "Scan complete" : state === "recording" ? hintFor(elapsed) : "Point at the problem";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-label="Video scan">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative flex items-center justify-between p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
          {state === "recording" ? `${Math.floor(elapsed)}s / ${MAX_SECONDS}s` : "Video scan"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close scan"
          className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6">
        <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/40 sm:inset-16" />
        <p
          aria-live="polite"
          className="relative rounded-full bg-black/60 px-5 py-2.5 text-center text-lg font-bold backdrop-blur"
        >
          {state === "complete" && <Check className="mr-1.5 inline h-5 w-5" />}
          {hint}
        </p>
      </div>

      <div className="relative p-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-4 h-1.5 max-w-md overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-center">
          {state === "starting" && <Loader2 className="h-10 w-10 animate-spin" />}
          {state === "ready" && (
            <button
              type="button"
              onClick={start}
              aria-label="Start scan"
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-white"
            >
              <span className="h-14 w-14 rounded-full bg-destructive" />
            </button>
          )}
          {state === "recording" && (
            <button
              type="button"
              onClick={stop}
              disabled={!canFinish}
              aria-label="Finish scan"
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-white disabled:opacity-50"
            >
              <span className="h-8 w-8 rounded-md bg-destructive" />
            </button>
          )}
          {state === "complete" && <Check className="h-12 w-12" />}
        </div>
        <p className="mt-3 text-center text-xs text-white/80">
          {state === "recording" && !canFinish ? "Keep going a few more seconds" : "5–10 seconds is enough"}
        </p>
      </div>
    </div>
  );
}
