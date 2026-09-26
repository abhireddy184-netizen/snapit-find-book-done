/**
 * Client-side media preparation for the Snap flow.
 * Everything here touches browser APIs and must only run in event handlers.
 */

export const MAX_DIMENSION = 1280;
export const JPEG_QUALITY = 0.82;
export const VIDEO_FRAME_TIMEOUT_MS = 12_000;
export const VIDEO_FRAMES_TIMEOUT_MS = 18_000;
export const VIDEO_FRAME_COUNT = 3;
export const IMAGE_READ_TIMEOUT_MS = 20_000;
/** ~1.5 MB of base64 — the server rejects frames above ~3 MB. */
export const MAX_UPLOAD_CHARS = 2_000_000;

export class MediaError extends Error {}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new MediaError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new MediaError("We couldn't read that file. Please try another one."));
    reader.onabort = () => reject(new MediaError("Reading the file was interrupted. Please try again."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new MediaError("That image couldn't be opened. Please try another photo."));
    img.src = src;
  });
}

function scaledSize(width: number, height: number) {
  const largest = Math.max(width, height);
  if (!largest || largest <= MAX_DIMENSION) return { width: width || MAX_DIMENSION, height: height || MAX_DIMENSION };
  const ratio = MAX_DIMENSION / largest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Downscale + re-encode a camera photo so high-resolution iPhone/Android
 * captures don't produce multi-megabyte data URLs. Falls back to the original
 * data URL if canvas encoding is unavailable.
 */
export async function compressImageFile(file: File): Promise<string> {
  const original = await withTimeout(
    readAsDataUrl(file),
    IMAGE_READ_TIMEOUT_MS,
    "Preparing that photo took too long. Please try again.",
  );
  try {
    const img = await withTimeout(
      loadImageElement(original),
      IMAGE_READ_TIMEOUT_MS,
      "Preparing that photo took too long. Please try again.",
    );
    const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    // Only keep the re-encode when it actually helps and looks valid.
    if (out.startsWith("data:image/jpeg") && out.length > 1000) {
      // Always prefer the downscaled JPEG: originals may be HEIC/PNG that the
      // vision providers reject, and are often many megabytes.
      if (out.length <= MAX_UPLOAD_CHARS) return out;
      const smaller = canvas.toDataURL("image/jpeg", 0.68);
      return smaller;
    }
    if (original.length <= MAX_UPLOAD_CHARS && /^data:image\/(jpeg|png|webp)/.test(original)) return original;
    throw new MediaError("That photo format couldn't be prepared. Please try another photo.");
  } catch (err) {
    if (err instanceof MediaError && /format/.test(err.message)) throw err;
    // A decode failure shouldn't block diagnosis when the original is small and a common format.
    if (original.length <= MAX_UPLOAD_CHARS && /^data:image\/(jpeg|png|webp)/.test(original)) return original;
    throw new MediaError("That photo couldn't be prepared. Please try another photo or take a new one.");
  }
}

/**
 * Grab a representative still from a video. Robust against browsers where
 * `seeked` never fires: we race metadata/seek/frame events against a timeout
 * and always revoke the object URL exactly once.
 */
export function extractVideoFrame(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* noop */
      }
      URL.revokeObjectURL(url);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new MediaError(message));
    };

    const capture = () => {
      if (settled) return;
      try {
        const canvas = document.createElement("canvas");
        const vs = scaledSize(video.videoWidth || 640, video.videoHeight || 480);
        canvas.width = vs.width;
        canvas.height = vs.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail("We couldn't read a frame from that video. Try a photo instead.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (!dataUrl || dataUrl.length < 1000) {
          return fail("That video frame came out blank. Try a photo instead.");
        }
        settled = true;
        cleanup();
        resolve(dataUrl);
      } catch {
        fail("We couldn't read a frame from that video. Try a photo instead.");
      }
    };

    timer = setTimeout(() => {
      // Some mobile browsers never fire `seeked`; try whatever frame we have.
      if (video.readyState >= 2) capture();
      else fail("That video took too long to open. Please try a photo instead.");
    }, VIDEO_FRAME_TIMEOUT_MS);

    const seekToFrame = () => {
      if (settled) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = duration > 0 ? Math.min(1, duration / 2) : 0;
      try {
        video.currentTime = target;
      } catch {
        capture();
      }
      // Safety net: if `seeked` never fires, grab the current frame anyway.
      setTimeout(() => {
        if (!settled && video.readyState >= 2) capture();
      }, 1500);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = seekToFrame;
    video.onloadedmetadata = () => {
      if (video.readyState >= 2) seekToFrame();
    };
    video.onseeked = capture;
    video.onerror = () => fail("We couldn't open that video. Please try a photo instead.");
    video.src = url;
    try {
      video.load();
    } catch {
      /* noop */
    }
  });
}

/**
 * Sample several representative stills spread across a short clip so the AI
 * sees motion/context instead of one arbitrary still. Falls back to a single
 * frame whenever the browser can't seek reliably.
 */
export function extractVideoFrames(file: File, count = VIDEO_FRAME_COUNT): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const frames: string[] = [];
    let settled = false;
    let targets: number[] = [];
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stepTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (stepTimer) clearTimeout(stepTimer);
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* noop */
      }
      URL.revokeObjectURL(url);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (frames.length === 0) {
        reject(new MediaError("We couldn't read a frame from that video. Try a photo instead."));
      } else {
        resolve(frames);
      }
    };

    const fail = (message: string) => {
      if (settled) return;
      if (frames.length > 0) return finish(); // partial success is good enough
      settled = true;
      cleanup();
      reject(new MediaError(message));
    };

    const grab = () => {
      if (settled) return;
      try {
        const canvas = document.createElement("canvas");
        const vs = scaledSize(video.videoWidth || 640, video.videoHeight || 480);
        canvas.width = vs.width;
        canvas.height = vs.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail("We couldn't read a frame from that video. Try a photo instead.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (dataUrl && dataUrl.length > 1000) frames.push(dataUrl);
      } catch {
        /* keep whatever we already captured */
      }
      next();
    };

    const next = () => {
      if (settled) return;
      if (stepTimer) clearTimeout(stepTimer);
      if (index >= targets.length) return finish();
      const target = targets[index++]!;
      try {
        video.currentTime = target;
      } catch {
        return finish();
      }
      // Safety net for browsers where `seeked` never fires.
      stepTimer = setTimeout(() => {
        if (!settled && video.readyState >= 2) grab();
        else finish();
      }, 2500);
    };

    const start = () => {
      if (settled || targets.length) return;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const wanted = Math.max(1, Math.min(count, duration >= 1.5 ? count : 1));
      targets = Array.from({ length: wanted }, (_, i) =>
        duration > 0 ? Math.min(duration - 0.05, (duration * (i + 0.5)) / wanted) : 0,
      );
      next();
    };

    timer = setTimeout(() => {
      if (!settled && frames.length === 0 && video.readyState >= 2) grab();
      else finish();
    }, VIDEO_FRAMES_TIMEOUT_MS);

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = start;
    video.onloadedmetadata = () => {
      if (video.readyState >= 2) start();
    };
    video.onseeked = grab;
    video.onerror = () => fail("We couldn't open that video. Please try a photo instead.");
    video.src = url;
    try {
      video.load();
    } catch {
      /* noop */
    }
  });
}

export type PreparedMedia = {
  /** Frames sent to the AI (1 for a photo, up to 3 for a short clip). */
  frames: string[];
  /** Single still used for the UI preview and history thumbnail. */
  preview: string;
};

export async function prepareMediaForAnalysis(file: File): Promise<PreparedMedia> {
  if (!file || file.size === 0) {
    throw new MediaError("That file appears to be empty. Please try again.");
  }
  if (file.type.startsWith("video/")) {
    let frames: string[];
    try {
      frames = await extractVideoFrames(file);
    } catch (err) {
      // Last-resort fallback to the original single-frame path.
      const single = await extractVideoFrame(file).catch(() => {
        throw err;
      });
      frames = [single];
    }
    return { frames, preview: frames[Math.floor(frames.length / 2)] ?? frames[0]! };
  }
  const image = await compressImageFile(file);
  return { frames: [image], preview: image };
}
