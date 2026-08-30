/**
 * Append-only merge for rolling provisional transcripts.
 *
 * Each provisional pass re-transcribes the whole clip, so the model may reword
 * earlier parts as it hears more. Replacing the composer text with every pass
 * makes words visibly disappear and reappear. This state machine instead keeps
 * a *committed* prefix that can only grow, plus an unstable tail that is allowed
 * to change: a tail fragment is promoted to committed once two consecutive
 * passes agree on it.
 *
 * Everything here is language- and script-agnostic: tokens are split on Unicode
 * whitespace, and for scripts written without spaces (Chinese, Japanese, Thai…)
 * it falls back to per-character tokens. No normalisation, casing, or
 * transliteration is applied, so Telugu, Devanagari, Arabic, romanized and
 * code-switched text pass through byte-for-byte.
 */

type Mode = "word" | "char";

function tokenize(text: string): { tokens: string[]; mode: Mode } {
  const words = text.split(/\s+/u).filter(Boolean);
  // Scriptio continua (CJK/Thai) yields one huge "word" — compare per character
  // so the committed prefix can still grow smoothly.
  if (words.length <= 1 && text.replace(/\s+/gu, "").length > 8) {
    return { tokens: Array.from(text.replace(/\s+/gu, "")), mode: "char" };
  }
  return { tokens: words, mode: "word" };
}

function join(tokens: string[], mode: Mode): string {
  return mode === "char" ? tokens.join("") : tokens.join(" ");
}

function commonPrefixLen(a: string[], b: string[]): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

export class StableTranscript {
  private committed: string[] = [];
  private prevTail: string[] = [];
  private tail: string[] = [];
  private mode: Mode = "word";

  /** Merge one provisional pass; returns the text to show right now. */
  push(text: string): string {
    const { tokens, mode } = tokenize(text);
    if (mode !== this.mode) {
      // Script shape changed (e.g. first pass was too short to classify).
      this.mode = mode;
      this.committed = [];
      this.prevTail = [];
    }

    const p = commonPrefixLen(tokens, this.committed);
    if (p === this.committed.length) {
      const candidateTail = tokens.slice(p);
      // Promote the part this pass and the previous one agree on.
      const agreed = commonPrefixLen(candidateTail, this.prevTail);
      if (agreed > 0) {
        this.committed = this.committed.concat(candidateTail.slice(0, agreed));
      }
      this.tail = candidateTail.slice(agreed);
      this.prevTail = this.tail.slice();
    } else {
      // The pass reworded already-committed text: keep the committed prefix and
      // only take whatever extends past it, so nothing the user saw is lost.
      const extra = tokens.slice(this.committed.length);
      this.tail = extra;
      this.prevTail = extra.slice();
    }
    return this.text;
  }

  /** Committed + unstable tail. */
  get text(): string {
    return join(this.committed.concat(this.tail), this.mode).trim();
  }

  /** Committed-only text — used to decide whether the final pass extends it. */
  get stableText(): string {
    return join(this.committed, this.mode).trim();
  }
}
