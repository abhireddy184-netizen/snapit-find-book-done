import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// ~8 MB of base64 ≈ 6 MB of audio ≈ well over a minute of speech.
const MAX_AUDIO_B64 = 8 * 1024 * 1024;

/**
 * Server-side voice transcription for browsers without the Web Speech API
 * (notably iPhone Safari). The client records a short clip via MediaRecorder
 * and sends it here; a Gemini model (audio-capable via the Lovable AI gateway)
 * returns the transcript.
 */
export const transcribeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        audioDataBase64: z.string().min(100).max(MAX_AUDIO_B64),
        // Recorder MIME types may carry codec params, e.g. "audio/webm;codecs=opus".
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
    const gateway = createLovableAiGatewayProvider(key);

    // Stream server-side so long generations survive platform request timeouts.
    const result = streamText({
      model: gateway("google/gemini-3.7-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the attached voice recording verbatim. The speaker is describing a task, errand, or day plan they want help with. Return ONLY the spoken words as plain text — no quotes, no commentary, no timestamps. If there is no intelligible speech, return an empty string.",
            },
            { type: "file", data: data.audioDataBase64, mediaType: data.mimeType },
          ],
        },
      ],
    });

    let text = "";
    try {
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          text += part.text;
        } else if (part.type === "error") {
          throw (part.error as Error) ?? new Error("stream error");
        }
      }
    } catch (err) {
      // Surface the underlying provider/gateway detail for debugging.
      const seen: string[] = [];
      let cur: unknown = err;
      for (let depth = 0; cur && depth < 4; depth++) {
        const c = cur as { name?: string; message?: string; statusCode?: number; responseBody?: unknown; cause?: unknown };
        seen.push(
          `${c.name ?? "Error"}: ${c.message ?? String(cur)}${c.statusCode ? ` [${c.statusCode}]` : ""}${
            typeof c.responseBody === "string" ? ` body=${c.responseBody.slice(0, 300)}` : ""
          }`,
        );
        cur = c.cause;
      }
      throw new Error(`Transcription failed :: ${seen.join(" <- ")}`);
    }
    return { text: text.trim() };
  });
