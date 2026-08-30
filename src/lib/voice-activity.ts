/**
 * Local, in-browser voice-activity detection for the mic composer.
 *
 * Nothing here leaves the device: it reads audio levels from the MediaStream the
 * user already approved when they tapped the mic, purely so recording can stop
 * itself once the person finishes speaking. There is no background or always-on
 * listening — a monitor only exists for the lifetime of one user-started clip.
 */

export const VAD_DEFAULTS = {
  /** Silence after speech that ends the clip. */
  silenceMs: 1400,
  /** If the user never speaks, give up after this long. */
  noSpeechMs: 7000,
  /** Absolute RMS floor; guards against a silent/near-dead input. */
  minRms: 0.012,
  /** Speech must sit this far above the measured room noise. */
  noiseMultiplier: 2.2,
  /**
   * Ceiling for the adaptive threshold. Normal speech sits well above this, so
   * a noisy room (or someone who starts talking instantly) can never raise the
   * bar so high that real speech is missed.
   */
  maxThreshold: 0.06,
  /** Consecutive loud frames required before we call it speech. */
  onsetFrames: 3,
};

export type VadOptions = Partial<typeof VAD_DEFAULTS>;

export type VadDecision = "continue" | "speech-ended" | "no-speech";

/**
 * Pure, time-injected VAD state machine — deterministic and unit-testable.
 * Feed it `(rms, timestampMs)` samples; it returns a terminal decision once.
 *
 * The noise floor is a running minimum rather than an average of the opening
 * frames: the user may already be talking when the first frame arrives, and an
 * averaged calibration would then mistake their voice for room noise.
 */
export class VoiceActivityState {
  private readonly o: typeof VAD_DEFAULTS;
  private startedAt: number | null = null;
  private noiseFloor = Number.POSITIVE_INFINITY;
  private loudRun = 0;
  private speechStarted = false;
  private lastVoiceAt = 0;
  private done = false;

  constructor(options: VadOptions = {}) {
    this.o = { ...VAD_DEFAULTS, ...options };
  }

  get hasSpeech(): boolean {
    return this.speechStarted;
  }

  /** Current speech threshold — exposed for tests/diagnostics. */
  get threshold(): number {
    const adaptive = Number.isFinite(this.noiseFloor)
      ? this.noiseFloor * this.o.noiseMultiplier
      : this.o.minRms;
    return Math.min(this.o.maxThreshold, Math.max(this.o.minRms, adaptive));
  }

  push(rms: number, now: number): VadDecision {
    if (this.done) return "continue";
    if (this.startedAt === null) this.startedAt = now;
    const elapsed = now - this.startedAt;

    if (rms < this.noiseFloor) this.noiseFloor = rms;
    const loud = rms >= this.threshold;

    if (!this.speechStarted) {
      this.loudRun = loud ? this.loudRun + 1 : 0;
      if (this.loudRun >= this.o.onsetFrames) {
        this.speechStarted = true;
        this.lastVoiceAt = now;
        return "continue";
      }
      if (elapsed >= this.o.noSpeechMs) {
        this.done = true;
        return "no-speech";
      }
      return "continue";
    }

    if (loud) {
      this.lastVoiceAt = now;
      return "continue";
    }
    if (now - this.lastVoiceAt >= this.o.silenceMs) {
      this.done = true;
      return "speech-ended";
    }
    return "continue";
  }
}

/** Root-mean-square level of a float PCM frame, 0..1-ish. */
export function frameRms(frame: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i] ?? 0;
    sum += v * v;
  }
  return frame.length ? Math.sqrt(sum / frame.length) : 0;
}

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export type VoiceActivityMonitor = { stop: () => void };

/**
 * Attaches an AnalyserNode to a live MediaStream and calls back once the
 * speaker goes quiet (or never starts). Returns `null` when the browser cannot
 * provide audio analysis, so the caller can fall back to manual stop.
 */
export function startVoiceActivityMonitor(
  stream: MediaStream,
  handlers: { onSpeechEnd: () => void; onNoSpeech: () => void },
  options: VadOptions = {},
): VoiceActivityMonitor | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  let ctx: AudioContext;
  let analyser: AnalyserNode;
  let source: MediaStreamAudioSourceNode;
  try {
    ctx = new Ctor();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
  } catch {
    return null;
  }

  const state = new VoiceActivityState(options);
  const buf = new Float32Array(analyser.fftSize);
  let raf: number | null = null;
  let timer: number | null = null;
  let stopped = false;

  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    if (raf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    if (timer !== null) clearInterval(timer);
    raf = null;
    timer = null;
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      /* ignore */
    }
    void ctx.close().catch(() => undefined);
  };

  const tick = () => {
    if (stopped) return;
    let rms = 0;
    try {
      if (typeof analyser.getFloatTimeDomainData === "function") {
        analyser.getFloatTimeDomainData(buf);
        rms = frameRms(buf);
      } else {
        const bytes = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(bytes);
        let sum = 0;
        for (let i = 0; i < bytes.length; i++) {
          const v = ((bytes[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        rms = Math.sqrt(sum / bytes.length);
      }
    } catch {
      cleanup();
      return;
    }
    const decision = state.push(rms, Date.now());
    if (decision === "speech-ended") {
      cleanup();
      handlers.onSpeechEnd();
      return;
    }
    if (decision === "no-speech") {
      cleanup();
      handlers.onNoSpeech();
      return;
    }
    if (raf !== null || typeof requestAnimationFrame === "function") {
      raf = requestAnimationFrame(tick);
    }
  };

  if (typeof requestAnimationFrame === "function") {
    raf = requestAnimationFrame(tick);
  } else {
    timer = setInterval(tick, 50) as unknown as number;
  }

  // Some browsers start the context suspended until resumed.
  void ctx.resume?.().catch(() => undefined);

  return { stop: cleanup };
}
