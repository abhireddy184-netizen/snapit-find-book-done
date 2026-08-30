import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_AUDIO_B64 = 8 * 1024 * 1024;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const STT_MODEL = "openai/gpt-4o-transcribe";
// No `language` field is sent: the model auto-detects the spoken language and
// handles accents plus code-switched speech (e.g. Telugu+English, Hindi+English).
const STT_PROMPT =
  "Everyday spoken request about errands, chores, home services, food, groceries, rides or appointments. The speaker may mix languages (for example English with Telugu, Hindi, Tamil or Spanish), have a strong accent, use broken grammar or filler words. Transcribe verbatim in the language actually spoken; do not translate, correct or add anything.";


function extFor(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

/**
 * Transcribes a short voice note (base64 audio) with the Lovable AI gateway's
 * speech-to-text model. Used by the outcome composer on browsers without the
 * Web Speech API (notably iPhone Safari).
 */
export const transcribeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        audioDataBase64: z.string().min(100).max(MAX_AUDIO_B64),
        mimeType: z
          .string()
          .regex(/^audio\/[a-z0-9.+-]+(?:\s*;.*)?$/i)
          .default("audio/mp4"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const bytes = Buffer.from(data.audioDataBase64, "base64");
    if (bytes.byteLength === 0) throw new Error("Empty audio payload");
    const baseMime = data.mimeType.split(";")[0]!.trim();
    const file = new File([new Uint8Array(bytes)], `voice.${extFor(baseMime)}`, { type: baseMime });

    const form = new FormData();
    form.append("file", file);
    form.append("model", STT_MODEL);
    form.append("prompt", STT_PROMPT);


    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Transcription failed: ${res.status} ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
