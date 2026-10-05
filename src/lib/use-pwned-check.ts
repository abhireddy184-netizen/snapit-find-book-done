import { useEffect, useState } from "react";
import { isPasswordValid } from "@/lib/password-policy";

export type BreachStatus = "pending" | "ok" | "leaked";

export const LEAKED_PASSWORD_MESSAGE =
  "This password has appeared in data breaches and is easy to guess. Please choose a different one.";

export function isWeakPasswordError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "weak_password" || /weak|easy to guess|pwned|breach/i.test(e?.message ?? "");
}

async function sha1Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * k-anonymity check against Have I Been Pwned: only the first 5 hex chars of the
 * SHA-1 hash leave the browser. Network failure/timeout counts as passed —
 * the server's leaked-password protection stays the final judge.
 */
export function usePwnedCheck(password: string): BreachStatus {
  const [result, setResult] = useState<{ pw: string; status: BreachStatus } | null>(null);
  const eligible = isPasswordValid(password);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      let status: BreachStatus = "ok";
      try {
        const hash = await sha1Hex(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);
        const timeout = window.setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          signal: ctrl.signal,
          headers: { "Add-Padding": "true" },
        });
        window.clearTimeout(timeout);
        if (res.ok) {
          const text = await res.text();
          const hit = text.split("\n").some((line) => {
            const [s, count] = line.trim().split(":");
            return s === suffix && Number(count) > 0;
          });
          if (hit) status = "leaked";
        }
      } catch {
        status = "ok";
      }
      if (!cancelled) setResult({ pw: password, status });
    }, 500);
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [password, eligible]);

  if (!eligible) return "pending";
  return result?.pw === password ? result.status : "pending";
}
