import { describe, it, expect } from "vitest";
import { StableTranscript } from "@/lib/stable-transcript";
describe("StableTranscript", () => {
  it("never shrinks committed text", () => {
    const s = new StableTranscript();
    s.push("నాకు ఇవాళ డిన్నర్ కావాలి");
    s.push("నాకు ఇవాళ డిన్నర్ కావాలి మరియు");
    const a = s.push("నాకు ఇవాళ డిన్నర్");
    expect(a.startsWith("నాకు ఇవాళ డిన్నర్ కావాలి")).toBe(true);
  });
  it("grows with agreement, mixed script", () => {
    const s = new StableTranscript();
    expect(s.push("I need dinner and")).toBe("I need dinner and");
    expect(s.push("I need dinner and groceries")).toContain("groceries");
    expect(s.push("I need dinner and groceries by 6 PM")).toContain("6 PM");
  });
});
