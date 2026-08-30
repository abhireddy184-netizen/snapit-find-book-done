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
import type { PlanUnderstanding } from "./plan-model";

/** Fast, strongly multilingual model for the understanding stage. */
const UNDERSTAND_MODEL = "google/gemini-3.7-flash";
/** Planner: same family, strong multilingual reasoning + JSON adherence. */
const PLAN_MODEL = "google/gemini-3.7-flash";

export const buildPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        request: z.string().min(3).max(600),
        location: z.string().max(80).optional(),
        nowClock: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const request = data.request.trim();
    const location = data.location?.trim() ?? "";
    const nowClock = data.nowClock ?? "09:00";

    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return buildFallbackPlan(request, location, nowClock);

    const gateway = createLovableAiGatewayProvider(key);

    // Stage 1 — universal language understanding. Converts any language, mixed
    // speech or broken grammar into a canonical intent, and flags only truly
    // critical ambiguities. Failure here is non-fatal: planning still runs.
    let understanding: PlanUnderstanding | undefined;
    try {
      const { text } = await generateText({
        model: gateway(UNDERSTAND_MODEL),
        system: UNDERSTAND_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUnderstandUserPrompt(request, location, nowClock) },
        ],
      });
      understanding = normalizeUnderstanding(text, request);
    } catch (error) {
      console.error("[plan] understanding stage failed; planning from raw request", error);
    }

    // Stage 2 — planning, in the user's own language.
    try {
      const { text } = await generateText({
        model: gateway(PLAN_MODEL),
        system: PLAN_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildPlanUserPrompt(request, location, nowClock, understanding),
          },
        ],
      });
      return normalizePlan(text, request, location, nowClock, understanding);
    } catch (error) {
      console.error("[plan] AI planning failed, using deterministic fallback", error);
      return buildFallbackPlan(request, location, nowClock, understanding);
    }
  });
