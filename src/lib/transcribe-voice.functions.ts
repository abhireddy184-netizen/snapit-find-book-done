import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_AUDIO_B64 = 8 * 1024 * 1024;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const STT_MODEL = "openai/gpt-4o-transcribe";
// No `language` field is sent: the model auto-detects the spoken language.
// The prompt is deliberately language-agnostic — any human language, dialect or
// mixture is expected, and no language list is implied.
const STT_PROMPT =
  "Everyday spoken request about errands, chores, home services, food, groceries, rides, appointments, airports and flights. The speaker may use ANY human language, dialect or regional variety, and may switch between languages within a single sentence; no language is unexpected. They may have a strong accent, speak quickly, use slang, broken grammar, incomplete phrases or filler words. Transcribe verbatim in the language and script actually spoken, keeping each code-switched word in its own language and script; never translate, transliterate, summarise, correct grammar, or add anything. Preserve proper nouns exactly as spoken: city and country names, airport codes (e.g. DFW, JFK, LHR, BLR), business or store names, street names, people's names, clock times with AM/PM, dates and quantities.";


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
