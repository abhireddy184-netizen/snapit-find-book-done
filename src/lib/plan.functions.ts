import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  PLAN_SYSTEM_PROMPT,
  UNDERSTAND_SYSTEM_PROMPT,
  buildFallbackPlan,
  buildPlanUserPrompt,
  buildUnderstandUserPrompt,
  normalizePlan,
  normalizeUnderstanding,
} from "./plan.server";
import type { GpbPlan, PlanUnderstanding } from "./plan-model";

/** Fast, strongly multilingual model for the understanding stage. */
const UNDERSTAND_MODEL = "google/gemini-3.7-flash";
/** Planner: same family, strong multilingual reasoning + JSON adherence. */
const PLAN_MODEL = "google/gemini-3.7-flash";

/**
 * Either a real plan, or a short conversational reply for messages that carry no
 * task at all (a greeting, a joke, a test). GPB answers those honestly instead
 * of fabricating a plan nobody asked for.
 */
export type PlanResult =
  | { kind: "plan"; plan: GpbPlan }
  | {
      kind: "conversation";
      reply: string;
      invitation?: string;
      languageCode: string;
      languageName: string;
    };

export const buildPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        request: z.string().min(3).max(600),
        location: z.string().max(80).optional(),
        nowClock: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        nowDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        timeZone: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PlanResult> => {
    const request = data.request.trim();
    const location = data.location?.trim() ?? "";
    const nowClock = data.nowClock ?? "09:00";
    const nowDate = data.nowDate;
    const timeZone = data.timeZone;

    const key = process.env['LOVABLE_API_KEY'];
    if (!key) {
      return {
        kind: "plan",
        plan: buildFallbackPlan(request, location, nowClock, undefined, nowDate, timeZone),
      };
    }

    const gateway = createLovableAiGatewayProvider(key);

    // Stage 1 — universal language understanding. Converts any language, mixed
    // speech or broken grammar into a canonical intent, decides whether there is
    // a task at all, and flags only truly critical ambiguities. Failure here is
    // non-fatal: planning still runs.
    let understanding: PlanUnderstanding | undefined;
    try {
      const { text } = await generateText({
        model: gateway(UNDERSTAND_MODEL),
        system: UNDERSTAND_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildUnderstandUserPrompt(request, location, nowClock, nowDate, timeZone),
          },
        ],
      });
      understanding = normalizeUnderstanding(text, request);
    } catch (error) {
      console.error("[plan] understanding stage failed; planning from raw request", error);
    }

    // No task in the message — reply briefly in their own language rather than
    // inventing a plan. Planning is skipped entirely.
    if (understanding?.actionability === "conversational" && understanding.conversationalReply) {
      return {
        kind: "conversation",
        reply: understanding.conversationalReply,
        ...(understanding.invitation ? { invitation: understanding.invitation } : {}),
        languageCode: understanding.languageCode,
        languageName: understanding.languageName,
      };
    }

    // Stage 2 — planning, in the user's own language.
    try {
      const { text } = await generateText({
        model: gateway(PLAN_MODEL),
        system: PLAN_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildPlanUserPrompt(request, location, nowClock, understanding, nowDate, timeZone),
          },
        ],
      });
      return {
        kind: "plan",
        plan: normalizePlan(text, request, location, nowClock, understanding, nowDate, timeZone),
      };
    } catch (error) {
      console.error("[plan] AI planning failed, using deterministic fallback", error);
      return {
        kind: "plan",
        plan: buildFallbackPlan(request, location, nowClock, understanding, nowDate, timeZone),
      };
    }
  });
