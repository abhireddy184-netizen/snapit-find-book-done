import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeAnalysis } from "./snap-analyze.server";
import { detectServiceIntentInText } from "./search-intent";


export type { SnapAnalysis, ServiceOption, IssueSource, ResponseKind } from "./snap-analyze.server";

export const analyzeSnap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(10).optional(),
        imageDataUrls: z.array(z.string().min(10)).max(4).optional(),
        note: z.string().optional(),
        latestMessage: z.string().optional(),
        askedQuestions: z.array(z.string()).max(12).optional(),
        turnCount: z.number().int().min(0).max(10).optional(),
        forceResolve: z.boolean().optional(),
      })
      .refine((v) => Boolean(v.imageDataUrl || v.imageDataUrls?.length || v.note?.trim()), {
        message: "Add a photo, a video or a description so GetPros can help.",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const images = data.imageDataUrls?.length ? data.imageDataUrls : data.imageDataUrl ? [data.imageDataUrl] : [];
    const hasMedia = images.length > 0;
    const note = data.note?.trim();
    const ctx = {
      latestMessage: data.latestMessage?.trim(),
      askedQuestions: data.askedQuestions ?? [],
      turnCount: data.turnCount ?? 0,
      forceResolve: data.forceResolve ?? false,
    };

    // Fast path: a text-only request whose words already name a catalogue
    // service (e.g. "my sink is broken") never needs the visual pipeline —
    // resolve it locally and return in milliseconds.
    if (!hasMedia && note && detectServiceIntentInText(ctx.latestMessage || note)) {
      return normalizeAnalysis("", true, false, note, { ...ctx, forceResolve: true });
    }

    const content: ({ type: "text"; text: string } | { type: "image"; image: string })[] = [
      { type: "text", text: buildUserPrompt(note, hasMedia, images.length, ctx) },
    ];
    for (const image of images) content.push({ type: "image", image });

    // Hard server-side budget so a slow upstream can never hang the UI.
    const budgetMs = hasMedia ? 28_000 : 15_000;
    try {
      const { text } = await generateText({
        // Fast multimodal chat model: no reasoning round-trips, so simple
        // requests come back in a couple of seconds.
        model: gateway("google/gemini-3.6-flash"),
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
        abortSignal: AbortSignal.timeout(budgetMs),
      });
      return normalizeAnalysis(text, Boolean(note), hasMedia, note, ctx);
    } catch (err) {
      // Graceful degradation: if the customer gave us words, resolve from the
      // catalogue instead of failing — they still reach a professional.
      if (note) return normalizeAnalysis("", true, hasMedia, note, { ...ctx, forceResolve: true });
      throw new Error(
        err instanceof Error && /abort|timeout/i.test(err.message)
          ? "That took longer than usual. Please try again, or add a short description."
          : "We couldn't analyse that just now. Please try again.",
      );
    }
  });

