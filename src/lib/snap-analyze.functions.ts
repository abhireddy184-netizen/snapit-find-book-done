import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { SYSTEM_PROMPT, buildUserPrompt, normalizeAnalysis } from "./snap-analyze.server";

export type { SnapAnalysis, ServiceOption, IssueSource, ResponseKind } from "./snap-analyze.server";

export const analyzeSnap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(10).optional(),
        imageDataUrls: z.array(z.string().min(10)).max(4).optional(),
        note: z.string().optional(),
      })
      .refine((v) => Boolean(v.imageDataUrl || v.imageDataUrls?.length || v.note?.trim()), {
        message: "Add a photo, a video or a description so GPB can help.",
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

    const content: ({ type: "text"; text: string } | { type: "image"; image: string })[] = [
      { type: "text", text: buildUserPrompt(note, hasMedia, images.length) },
    ];
    for (const image of images) content.push({ type: "image", image });

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    return normalizeAnalysis(text, Boolean(note));
  });
