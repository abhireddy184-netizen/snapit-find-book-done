import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  createPhotoRecoveryAnalysis,
  normalizeAnalysis,
} from "./snap-analyze.server";
import { runVision, type VisionError } from "./vision-providers.server";
import { detectServiceIntentInText } from "./search-intent";
import { createFastPathAnalysis } from "./snap-fast-path";

export type { SnapAnalysis, ServiceOption, IssueSource, ResponseKind } from "./snap-analyze.server";

// ~2.2 MB of base64 per frame keeps the whole request small even for 4 frames.
const MAX_FRAME_CHARS = 3_000_000;

export const analyzeSnap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(10).max(MAX_FRAME_CHARS).optional(),
        imageDataUrls: z.array(z.string().min(10).max(MAX_FRAME_CHARS)).max(4).optional(),
        note: z.string().max(4000).optional(),
        latestMessage: z.string().max(4000).optional(),
        askedQuestions: z.array(z.string()).max(12).optional(),
        turnCount: z.number().int().min(0).max(10).optional(),
        forceResolve: z.boolean().optional(),
        /** Previous attempt found no working vision provider: resolve from words only. */
        skipVision: z.boolean().optional(),
        /** Dev-only fault injection for testing failover; ignored in production. */
        simulateFail: z.enum(["primary", "all"]).optional(),
      })
      .refine((v) => Boolean(v.imageDataUrl || v.imageDataUrls?.length || v.note?.trim()), {
        message: "Add a photo, a video or a description so GetPros can help.",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const images = data.imageDataUrls?.length ? data.imageDataUrls : data.imageDataUrl ? [data.imageDataUrl] : [];
    const hasMedia = images.length > 0;
    const note = data.note?.trim();
    const ctx = {
      latestMessage: data.latestMessage?.trim(),
      askedQuestions: data.askedQuestions ?? [],
      turnCount: data.turnCount ?? 0,
      forceResolve: data.forceResolve ?? false,
    };
    const simulateFail = process.env["NODE_ENV"] === "production" ? undefined : data.simulateFail;

    // Fast path: a text-only request that already names a catalog service.
    const fastHit = !hasMedia && note ? detectServiceIntentInText(ctx.latestMessage || note) : null;
    if (fastHit && note) return createFastPathAnalysis(note, fastHit);

    // Recovery follow-up: the photo couldn't be read, so resolve from the words
    // locally instead of waiting on providers that just failed.
    if (data.skipVision && note) {
      return {
        ...normalizeAnalysis("", true, false, note, { ...ctx, forceResolve: true }),
        visionUnavailable: hasMedia || undefined,
      };
    }

    try {
      const { text } = await runVision(
        { system: SYSTEM_PROMPT, text: buildUserPrompt(note, hasMedia, images.length, ctx), images },
        { totalBudgetMs: hasMedia ? 14_000 : 5_500, simulateFail },
      );
      return normalizeAnalysis(text, Boolean(note), hasMedia, note, ctx);
    } catch (err) {
      const failures = Array.isArray(err) ? (err as VisionError[]) : [];
      console.error(
        "[analyzeSnap] all vision providers failed:",
        failures.map((f) => `${f.provider}=${f.kind}${f.status ? `/${f.status}` : ""}`).join(", ") || String(err),
      );
      // Words available: resolve from the catalog (never claim the photo was read).
      if (note) {
        return {
          ...normalizeAnalysis("", true, false, note, { ...ctx, forceResolve: true }),
          visionUnavailable: hasMedia || undefined,
        };
      }
      // Photo only: keep it on screen and ask for one short hint.
      return createPhotoRecoveryAnalysis();
    }
  });
