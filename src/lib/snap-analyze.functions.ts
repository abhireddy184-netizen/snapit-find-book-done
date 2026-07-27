import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  imageDataUrl: z.string().min(10),
  note: z.string().optional(),
});

export type SnapAnalysis = {
  category: string;
  categorySlug: string;
  confidence: number;
  problem: string;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  estimatedDurationMinutes: number;
  urgency: "low" | "medium" | "high" | "emergency";
  urgencyReason: string;
  recommendedActions: string[];
};

const SYSTEM = `You are SnapIt's AI diagnostic assistant for a local home & personal services marketplace.
You look at a customer's photo (and optional note) of a problem or task and return a concise structured diagnosis.

Choose ONE categorySlug from: plumbing, electrical, hvac, house-cleaning, handyman, lawn-care, appliance-repair, beauty-spa, moving-help, auto-services.

Urgency scale:
- emergency: safety hazard, active leak/flood, no heat in winter, sparks/smoke — needs someone in <2h
- high: rapidly worsening, blocks daily use — same day
- medium: should be fixed this week
- low: cosmetic or convenience

Return ONLY valid minified JSON, no markdown, matching this TypeScript type exactly:
{"category":string,"categorySlug":string,"confidence":number(0-1),"problem":string,"estimatedCostLow":number,"estimatedCostHigh":number,"estimatedDurationMinutes":number,"urgency":"low"|"medium"|"high"|"emergency","urgencyReason":string,"recommendedActions":string[]}`;

export const analyzeSnap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<SnapAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Diagnose this. Optional customer note: ${data.note?.trim() || "(none)"}. Respond with JSON only.`,
            },
            { type: "image", image: data.imageDataUrl },
          ],
        },
      ],
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : text;
    let parsed: SnapAnalysis;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        category: "Handyman",
        categorySlug: "handyman",
        confidence: 0.4,
        problem: "Unable to fully analyze the image. A local handyman can take a closer look.",
        estimatedCostLow: 75,
        estimatedCostHigh: 200,
        estimatedDurationMinutes: 60,
        urgency: "medium",
        urgencyReason: "Defaulted — please add more detail or try another photo.",
        recommendedActions: ["Add a note describing the issue", "Try a clearer, well-lit photo"],
      };
    }
    if (!parsed.estimatedDurationMinutes || parsed.estimatedDurationMinutes < 15) {
      parsed.estimatedDurationMinutes = 60;
    }
    return parsed;
  });