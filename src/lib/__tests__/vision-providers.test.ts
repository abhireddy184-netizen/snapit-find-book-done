import { afterEach, describe, expect, it, vi } from "vitest";
import { runVision } from "../vision-providers.server";
import { collectVisionStream } from "../vision-stream.server";

function stream(parts: string[]) {
  return new Response(new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  }));
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("photo-only vision", () => {
  it("reads split metadata and real text deltas until DONE", async () => {
    expect(await collectVisionStream(stream([
      ': ping\n\ndata: {"choices":[]}\n\n',
      'data: {"choices":[{"delta":{"content":"{\\"categorySlug\\":\\"plum',
      'bing\\"}"}}]}\n\ndata: [DONE]\n\n',
    ]))).toBe('{"categorySlug":"plumbing"}');
  });

  it("rejects interrupted output instead of inventing a diagnosis", async () => {
    await expect(collectVisionStream(stream(['data: {"choices":[]}\n\n']))).rejects.toThrow("before completion");
  });

  it("does not discard successful image inference after the old 14-second deadline", async () => {
    vi.useFakeTimers();
    vi.stubEnv("LOVABLE_API_KEY", "test-only");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    let suppliedSignal: AbortSignal | null = null;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      suppliedSignal = init.signal ?? null;
      expect(JSON.parse(String(init.body)).stream).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 21_000));
      if (suppliedSignal?.aborted) throw new Error("timeout");
      return stream(['data: {"choices":[{"delta":{"content":"{\\"categorySlug\\":\\"plumbing\\"}"}}]}\n\ndata: [DONE]\n\n']);
    }));
    const pending = runVision({ system: "test", text: "image only", images: ["data:image/jpeg;base64,AAAA"] }, {});
    await vi.advanceTimersByTimeAsync(21_000);
    expect(await pending).toEqual({ text: '{"categorySlug":"plumbing"}', provider: "lovable-gateway" });
  });
});