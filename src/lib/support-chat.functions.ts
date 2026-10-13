import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  FALLBACK_FAQ,
  SUPPORT_SYSTEM_PROMPT,
  allowRequest,
  matchFaq,
} from "./support-chat.server";
import { CONTACT_EMAIL } from "./brand";

/** Same model family the planner already uses through the existing gateway provider. */
const SUPPORT_MODEL = "google/gemini-3.7-flash";

export type SupportReply = {
  reply: string;
  /** "ai" = generated live; "faq" = scripted fallback; "limited" = rate limited. */
  source: "ai" | "faq" | "limited";
};

export const askSupport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(1000),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SupportReply> => {
    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anon";
    if (!allowRequest(ip)) {
      return {
        source: "limited",
        reply: `You've sent a lot of messages in a short time. Please wait a few minutes, or email ${CONTACT_EMAIL}.`,
      };
    }

    const messages = data.messages.slice(-10);
    const last = messages[messages.length - 1].content;
    const fallback = (): SupportReply => {
      const k = matchFaq(last);
      return {
        source: "faq",
        reply: k
          ? FALLBACK_FAQ[k]
          : `Our AI assistant isn't available right now. Please email ${CONTACT_EMAIL} and we'll help.`,
      };
    };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fallback();

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const result = streamText({
        model: gateway(SUPPORT_MODEL),
        system: SUPPORT_SYSTEM_PROMPT,
        messages,
        maxOutputTokens: 600,
        maxRetries: 0,
      });
      const text = (await result.text).trim();
      if (!text) return fallback();
      return { source: "ai", reply: text.slice(0, 2000) };
    } catch (error) {
      console.error("[support-chat] AI call failed; using FAQ fallback", error);
      return fallback();
    }
  });
