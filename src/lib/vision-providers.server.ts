/**
 * Vision provider abstraction for photo/video analysis.
 *
 * Order: a user-owned direct Google Gemini key (GEMINI_API_KEY or
 * GOOGLE_GENERATIVE_AI_API_KEY) first, Lovable AI Gateway second. Each provider
 * has a per-isolate circuit breaker so a known-dead provider (no credits, bad
 * key) is skipped instantly instead of making the customer wait again.
 */

export type VisionFailureKind =
  | "quota"        // credits / billing exhausted (402, RESOURCE_EXHAUSTED quota)
  | "auth"         // missing / invalid / unregistered key (401, 403)
  | "rate_limit"   // 429
  | "upstream"     // 5xx
  | "timeout"
  | "bad_payload"  // 400 / 413 — image rejected
  | "model"        // 404 / unknown model / empty or unparseable output
  | "network"
  | "not_configured";

export class VisionError extends Error {
  constructor(
    public provider: string,
    public kind: VisionFailureKind,
    public status: number | null,
    detail: string,
  ) {
    super(`[vision:${provider}] ${kind}${status ? ` (${status})` : ""}: ${detail}`);
  }
}

export type VisionContent = { text: string; images: string[]; system: string };

type Provider = {
  name: string;
  configured: () => boolean;
  call: (c: VisionContent, signal: AbortSignal) => Promise<string>;
};

/* ---------------- circuit breaker ---------------- */

const openUntil = new Map<string, number>();
const COOLDOWN_MS: Partial<Record<VisionFailureKind, number>> = {
  quota: 5 * 60_000,
  auth: 5 * 60_000,
  model: 2 * 60_000,
  rate_limit: 30_000,
  upstream: 30_000,
  timeout: 30_000,
  network: 30_000,
};

function isOpen(name: string) {
  const until = openUntil.get(name) ?? 0;
  return until > Date.now();
}
function trip(name: string, kind: VisionFailureKind) {
  const ms = COOLDOWN_MS[kind];
  if (ms) openUntil.set(name, Date.now() + ms);
}

/* ---------------- classification ---------------- */

function classifyHttp(provider: string, status: number, body: string): VisionError {
  const snippet = body.replace(/\s+/g, " ").slice(0, 240);
  const quotaHint = /credit|quota|billing|insufficient|payment/i.test(body);
  let kind: VisionFailureKind;
  if (status === 402) kind = "quota";
  else if (status === 401) kind = "auth";
  else if (status === 403) kind = quotaHint ? "quota" : "auth";
  else if (status === 429) kind = quotaHint && /quota/i.test(body) && /exceeded|exhausted/i.test(body) ? "quota" : "rate_limit";
  else if (status === 404) kind = "model";
  else if (status === 400 || status === 413) kind = /model/i.test(body) && !/image|inline|mime|size/i.test(body) ? "model" : "bad_payload";
  else if (status >= 500) kind = "upstream";
  else kind = "model";
  return new VisionError(provider, kind, status, snippet);
}

function classifyThrown(provider: string, err: unknown): VisionError {
  if (err instanceof VisionError) return err;
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  if (/abort|timeout/i.test(msg)) return new VisionError(provider, "timeout", null, "request exceeded budget");
  return new VisionError(provider, "network", null, msg.slice(0, 200));
}

function splitDataUrl(dataUrl: string) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new VisionError("input", "bad_payload", null, "image is not a base64 data URL");
  return { mime: m[1]!, data: m[2]! };
}

/* ---------------- providers ---------------- */

function geminiKey() {
  return process.env["GEMINI_API_KEY"] || process.env["GOOGLE_GENERATIVE_AI_API_KEY"] || "";
}

const directGemini: Provider = {
  name: "google-direct",
  configured: () => Boolean(geminiKey()),
  async call(c, signal) {
    const model = process.env["GEMINI_VISION_MODEL"] || "gemini-2.5-flash";
    const parts: unknown[] = [{ text: c.text }];
    for (const img of c.images) {
      const { mime, data } = splitDataUrl(img);
      parts.push({ inline_data: { mime_type: mime, data } });
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: c.system }] },
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    const body = await res.text();
    if (!res.ok) throw classifyHttp(this.name, res.status, body);
    let text = "";
    try {
      const json = JSON.parse(body);
      text = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    } catch {
      /* handled below */
    }
    if (!text.trim()) throw new VisionError(this.name, "model", res.status, "empty response");
    return text;
  },
};

const lovableGateway: Provider = {
  name: "lovable-gateway",
  configured: () => Boolean(process.env["LOVABLE_API_KEY"]),
  async call(c, signal) {
    const content: unknown[] = [{ type: "text", text: c.text }];
    for (const img of c.images) {
      splitDataUrl(img); // validate before spending a request
      content.push({ type: "image_url", image_url: { url: img } });
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: c.system },
          { role: "user", content },
        ],
      }),
    });
    const body = await res.text();
    if (!res.ok) throw classifyHttp(this.name, res.status, body);
    let text = "";
    try {
      text = JSON.parse(body)?.choices?.[0]?.message?.content ?? "";
    } catch {
      /* handled below */
    }
    if (!text.trim()) throw new VisionError(this.name, "model", res.status, "empty response");
    return text;
  },
};

const PROVIDERS: Provider[] = [directGemini, lovableGateway];

export function visionProviderStatus() {
  return PROVIDERS.map((p) => ({ name: p.name, configured: p.configured(), open: isOpen(p.name) }));
}

/**
 * Try each healthy provider once within a total budget. Returns raw model text
 * and which provider answered, or throws the list of failures.
 */
export async function runVision(
  c: VisionContent,
  opts: { totalBudgetMs: number; simulateFail?: "primary" | "all" },
): Promise<{ text: string; provider: string }> {
  const started = Date.now();
  const failures: VisionError[] = [];
  const candidates = PROVIDERS.filter((p) => p.configured());
  if (!candidates.length) throw [new VisionError("all", "not_configured", null, "no vision provider key")];

  for (let i = 0; i < candidates.length; i += 1) {
    const p = candidates[i]!;
    if (isOpen(p.name) && !opts.simulateFail) {
      failures.push(new VisionError(p.name, "upstream", null, "skipped: circuit open"));
      continue;
    }
    const remaining = opts.totalBudgetMs - (Date.now() - started);
    if (remaining < 1500) break;
    const healthyLeft = candidates.slice(i + 1).filter((q) => !isOpen(q.name)).length;
    // Leave room for one quick failover when another provider is available.
    const slice = healthyLeft ? Math.min(remaining - 4000, Math.round(opts.totalBudgetMs * 0.6)) : remaining;
    const t0 = Date.now();
    try {
      if (opts.simulateFail === "all" || (opts.simulateFail === "primary" && i === 0)) {
        throw new VisionError(p.name, "upstream", 503, "simulated failure (dev only)");
      }
      const text = await p.call(c, AbortSignal.timeout(Math.max(1500, slice)));
      console.info(`[vision] ok provider=${p.name} ms=${Date.now() - t0}`);
      return { text, provider: p.name };
    } catch (err) {
      const e = classifyThrown(p.name, err);
      failures.push(e);
      if (!opts.simulateFail) trip(p.name, e.kind);
      console.warn(`${e.message} ms=${Date.now() - t0}`);
      // A bad image will fail everywhere — don't burn the second provider.
      if (e.kind === "bad_payload") break;
    }
  }
  throw failures;
}
