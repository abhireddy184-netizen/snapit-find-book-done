import { describe, expect, it } from "vitest";
import { allowRequest, matchFaq, FALLBACK_FAQ, SUPPORT_SYSTEM_PROMPT } from "../support-chat.server";

describe("support chat rules", () => {
  it("allows 12 messages per IP then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 12; i++) expect(allowRequest("t-ip", now)).toBe(true);
    expect(allowRequest("t-ip", now)).toBe(false);
    expect(allowRequest("t-ip", now + 11 * 60 * 1000)).toBe(true);
  });
  it("area answer uses the expansion wording, no launch date", () => {
    expect(FALLBACK_FAQ.area).toBe("We're expanding; sign up and we'll notify you when we're available in your area.");
    expect(matchFaq("Is it available in my area?")).toBe("area");
  });
  it("prompt forbids invented prices and card requests", () => {
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/Never invent prices/);
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/Never ask for or accept card numbers/);
  });
});

import { FALLBACK_FAQ_ES, fallbackReply, languageInstruction } from "../support-chat.server";
import { PULSE_COPY, detectPulseLang, PRO_SIGNUP_PATH, PULSE_CATEGORIES } from "../pulse-copy";

describe("GPA Pulse rules", () => {
  it("states the pro model: free signup, no lead fees, keep 85%", () => {
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/signing up is FREE/);
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/NO lead fees/);
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/keep 85% of every job/);
    expect(SUPPORT_SYSTEM_PROMPT).toMatch(/226\+ services across 32 categories/);
    expect(FALLBACK_FAQ.pro).toMatch(/85%/);
    expect(FALLBACK_FAQ_ES.pro).toMatch(/85%/);
  });
  it("uses the exact welcome messages", () => {
    expect(PULSE_COPY.en.welcome).toBe("Hey there! 👋 I'm Pulse, your GetPros.ai assistant. Need something fixed, cleaned, installed, or improved? I'm here to help!");
    expect(PULSE_COPY.es.welcome).toBe("¡Hola! 👋 Soy Pulse, tu asistente de GetPros.ai. ¿Necesitas reparar, limpiar, instalar o mejorar algo? ¡Estoy aquí para ayudarte!");
  });
  it("defaults to Spanish for Spanish browsers unless the visitor chose a language", () => {
    expect(detectPulseLang(null, ["es-MX", "en-US"])).toBe("es");
    expect(detectPulseLang(null, ["en-US"])).toBe("en");
    expect(detectPulseLang("en", ["es-ES"])).toBe("en");
  });
  it("answers in Spanish when the AI is down and Spanish is selected", () => {
    expect(fallbackReply("¿Cómo me uno como proveedor?", "es")).toBe(FALLBACK_FAQ_ES.pro);
    expect(languageInstruction("es")).toMatch(/Spanish/);
  });
  it("pro signup goes to the provider registration page", () => {
    expect(PRO_SIGNUP_PATH).toBe("/register?role=provider");
    expect(PULSE_CATEGORIES.map((c) => c.slug)).toEqual(["plumbing", "electrical", "cleaning", "hvac", "handyman", "appliances"]);
  });
});
