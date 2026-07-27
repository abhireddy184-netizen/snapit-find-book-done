import type { SnapAnalysis } from "./snap-analyze.functions";

const KEY = "snapit.history.v1";

export type SnapHistoryEntry = {
  id: string;
  createdAt: number;
  note?: string;
  thumbnail: string;
  analysis: SnapAnalysis;
};

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadHistory(): SnapHistoryEntry[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<SnapHistoryEntry, "id" | "createdAt">): SnapHistoryEntry {
  const s = safeStorage();
  const full: SnapHistoryEntry = {
    ...entry,
    id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  if (!s) return full;
  const list = [full, ...loadHistory()].slice(0, 50);
  try {
    s.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
  return full;
}

export function removeHistoryEntry(id: string) {
  const s = safeStorage();
  if (!s) return;
  const list = loadHistory().filter((e) => e.id !== id);
  s.setItem(KEY, JSON.stringify(list));
}

export function clearHistory() {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(KEY);
}

export function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}