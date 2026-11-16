import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIGNUP_LANG,
  SIGNUP_COPY,
  isContactComplete,
  signupErrorText,
  toSignupError,
} from "../pro-signup-copy";

function keysDeep(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? keysDeep(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("Pro signup language", () => {
  it("defaults to English", () => {
    expect(DEFAULT_SIGNUP_LANG).toBe("en");
  });

  it("has a Spanish string for every English string", () => {
    expect(keysDeep(SIGNUP_COPY.es).sort()).toEqual(keysDeep(SIGNUP_COPY.en).sort());
    for (const key of keysDeep(SIGNUP_COPY.es)) {
      const value = key.split(".").reduce<any>((o, k) => o[k], SIGNUP_COPY.es);
      expect(value, key).not.toBe("");
    }
  });

  it("shows the same validation error translated", () => {
    const err = { key: "missingContact" } as const;
    expect(signupErrorText(err, "en")).toBe(SIGNUP_COPY.en.errors.missingContact);
    expect(signupErrorText(err, "es")).toBe(SIGNUP_COPY.es.errors.missingContact);
  });

  it("keeps service messages in English but translates them in Spanish", () => {
    const err = toSignupError(new Error("Signups not allowed"), "startFailed");
    expect(signupErrorText(err, "en")).toBe("Signups not allowed");
    expect(signupErrorText(err, "es")).toBe(SIGNUP_COPY.es.errors.startFailed);
  });
});

describe("Pro signup contact rule (unchanged)", () => {
  const ok = { name: "Al", email: "a@b.co", phone: "(214) 555-0100", consent: true };
  it("accepts a complete contact", () => expect(isContactComplete(ok)).toBe(true));
  it("needs 2+ character name", () => expect(isContactComplete({ ...ok, name: "A" })).toBe(false));
  it("needs a valid email", () => expect(isContactComplete({ ...ok, email: "a@b" })).toBe(false));
  it("needs 10+ phone digits", () =>
    expect(isContactComplete({ ...ok, phone: "214-555-010" })).toBe(false));
  it("needs consent", () => expect(isContactComplete({ ...ok, consent: false })).toBe(false));
});
