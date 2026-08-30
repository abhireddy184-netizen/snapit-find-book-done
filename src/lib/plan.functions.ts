import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  PLAN_SYSTEM_PROMPT,
  buildFallbackPlan,
  buildPlanUserPrompt,
  normalizePlan,
} from "./plan.server";

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

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway("google/gemini-3.7-flash"),
        system: PLAN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPlanUserPrompt(request, location, nowClock) }],
      });
      return normalizePlan(text, request, location, nowClock);
    } catch (error) {
      console.error("[plan] AI planning failed, using deterministic fallback", error);
      return buildFallbackPlan(request, location, nowClock);
    }
  });
