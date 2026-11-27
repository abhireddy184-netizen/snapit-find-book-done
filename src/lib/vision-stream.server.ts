/** Collect actual Chat Completions deltas, including split frames and metadata. */
export async function collectVisionStream(response: Response): Promise<string> {
  if (!response.body) throw new Error("Vision response has no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let text = "";
  let completed = false;
  const frame = (value: string) => {
    const data = value.split("\n").filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim()).join("\n");
    if (!data) return;
    if (data === "[DONE]") { completed = true; return; }
    const json = JSON.parse(data);
    if (json.error) throw new Error("Vision provider returned a stream error");
    for (const choice of json.choices ?? []) {
      if (choice.delta?.refusal || choice.finish_reason === "content_filter") {
        throw new Error("Vision provider declined this image");
      }
      if (typeof choice.delta?.content === "string") text += choice.delta.content;
    }
  };
  try {
    while (true) {
      const chunk = await reader.read();
      pending += decoder.decode(chunk.value, { stream: !chunk.done }).replace(/\r\n/g, "\n");
      let boundary = pending.indexOf("\n\n");
      while (boundary >= 0) {
        frame(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        boundary = pending.indexOf("\n\n");
      }
      if (chunk.done) break;
    }
    if (pending.trim()) frame(pending);
    if (!completed) throw new Error("Vision stream ended before completion");
    return text;
  } finally {
    reader.releaseLock();
  }
}