import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_KEYS,
  __setStoresForTest,
  clearGuestHistory,
  clearHistory,
  loadHistory,
  removeHistoryEntry,
  saveHistoryEntry,
  type HistoryScope,
} from "../snap-history";

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

const A: HistoryScope = { kind: "user", userId: "user-a" };
const B: HistoryScope = { kind: "user", userId: "user-b" };
const GUEST: HistoryScope = { kind: "guest" };
const entry = (problem: string) => ({ thumbnail: "", analysis: { problem } as never });

let local: MemStorage;
let session: MemStorage;
beforeEach(() => {
  local = new MemStorage();
  session = new MemStorage();
  __setStoresForTest({ local, session });
});
afterEach(() => __setStoresForTest(null));

describe("diagnosis history scoping", () => {
  it("account B never sees account A's entries", () => {
    saveHistoryEntry(A, entry("A leak"));
    expect(loadHistory(B)).toEqual([]);
    expect(loadHistory(A)).toHaveLength(1);
  });

  it("guest entries are not visible to a signed-in account and vice versa", () => {
    saveHistoryEntry(GUEST, entry("guest"));
    saveHistoryEntry(A, entry("a"));
    expect(loadHistory(A).map((e) => e.analysis.problem)).toEqual(["a"]);
    expect(loadHistory(GUEST).map((e) => e.analysis.problem)).toEqual(["guest"]);
  });

  it("guest history lives only in session storage", () => {
    saveHistoryEntry(GUEST, entry("guest"));
    expect(local.length).toBe(0);
    expect(session.length).toBe(1);
  });

  it("signed-in history survives a refresh (re-reading storage)", () => {
    saveHistoryEntry(A, entry("persist"));
    __setStoresForTest({ local, session: new MemStorage() });
    expect(loadHistory(A)).toHaveLength(1);
  });

  it("guest history is gone in a new browser session", () => {
    saveHistoryEntry(GUEST, entry("tab"));
    __setStoresForTest({ local, session: new MemStorage() });
    expect(loadHistory(GUEST)).toEqual([]);
  });

  it("unknown scope (auth loading) reads nothing and writes nothing", () => {
    saveHistoryEntry(A, entry("a"));
    expect(loadHistory(null)).toEqual([]);
    saveHistoryEntry(null, entry("x"));
    expect(loadHistory(A)).toHaveLength(1);
    expect(local.length).toBe(1);
  });

  it("legacy unscoped history is discarded, never given to a user", () => {
    for (const k of LEGACY_KEYS) local.setItem(k, JSON.stringify([{ id: "old", analysis: {} }]));
    expect(loadHistory(A)).toEqual([]);
    expect(loadHistory(GUEST)).toEqual([]);
    for (const k of LEGACY_KEYS) expect(local.getItem(k)).toBeNull();
  });

  it("remove and clear only affect the current account", () => {
    const a = saveHistoryEntry(A, entry("a"));
    saveHistoryEntry(B, entry("b"));
    removeHistoryEntry(B, a.id);
    expect(loadHistory(A)).toHaveLength(1);
    clearHistory(B);
    expect(loadHistory(A)).toHaveLength(1);
    expect(loadHistory(B)).toEqual([]);
  });

  it("signing in clears the previous guest's tab history", () => {
    saveHistoryEntry(GUEST, entry("guest"));
    clearGuestHistory();
    expect(loadHistory(GUEST)).toEqual([]);
  });

  it("fails closed when storage is unavailable", () => {
    __setStoresForTest({ local: null, session: null });
    saveHistoryEntry(A, entry("a"));
    expect(loadHistory(A)).toEqual([]);
    expect(loadHistory(GUEST)).toEqual([]);
  });
});
