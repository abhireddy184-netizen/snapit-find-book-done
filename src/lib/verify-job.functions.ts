import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  beforeImage: z.string().min(10),
  afterImage: z.string().min(10),
  scope: z.string().min(1),
});

export type VerificationVerdict = {
  result: "appears_completed" | "needs_manual_review" | "unable_to_verify";
  summary: string;
  observations: string[];
};

const SYSTEM = `You compare a BEFORE photo and an AFTER photo of a service or repair job.
You are a conservative visual assistant, NOT a professional inspector. Never claim certainty.

Return ONLY minified JSON matching:
{"result":"appears_completed"|"needs_manual_review"|"unable_to_verify","summary":string,"observations":string[]}

Rules:
- "appears_completed" only when the after photo clearly shows the described work done and the original problem no longer visible.
- "needs_manual_review" when the photos are of the same subject but the outcome is partial, ambiguous, or new issues appear.
- "unable_to_verify" when the photos show different subjects, are unclear, or nothing can be compared.
- summary: one short sentence, hedged language ("appears", "looks like").
- observations: 2-4 short factual visual differences.`;

export const verifyJobCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<VerificationVerdict> => {
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
            { type: "text", text: `Agreed scope of work: ${data.scope}. First image is BEFORE, second is AFTER. Respond with JSON only.` },
            { type: "image", image: data.beforeImage },
            { type: "image", image: data.afterImage },
          ],
        },
      ],
    });

    const match = text.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(match ? match[0] : text) as VerificationVerdict;
      if (!Array.isArray(parsed.observations)) parsed.observations = [];
      if (!["appears_completed", "needs_manual_review", "unable_to_verify"].includes(parsed.result)) {
        parsed.result = "needs_manual_review";
      }
      return parsed;
    } catch {
      return {
        result: "unable_to_verify",
        summary: "The AI visual check could not read these photos clearly.",
        observations: [],
      };
    }
  });