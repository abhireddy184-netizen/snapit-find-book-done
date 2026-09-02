/** Single source of truth for the GetPros password policy (signup, reset, change). */

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "8+ characters", test: (v) => v.length >= 8 },
  {
    id: "case",
    label: "Uppercase and lowercase letter",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { id: "number", label: "At least 1 number", test: (v) => /\d/.test(v) },
  {
    id: "special",
    label: "At least 1 special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function passwordChecklist(value: string) {
  return passwordRules.map((rule) => ({ ...rule, met: rule.test(value) }));
}

export function isPasswordValid(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}

export function passwordError(value: string): string | null {
  const missing = passwordRules.filter((rule) => !rule.test(value));
  if (missing.length === 0) return null;
  return `Your password still needs: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`;
}
