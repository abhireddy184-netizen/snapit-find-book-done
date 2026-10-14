import type { SnapAnalysis } from "./snap-analyze.functions";

/**
 * Personal AI diagnosis history, always scoped to one identity:
 *  - signed-in: localStorage key containing the auth user id
 *  - guest: sessionStorage (this tab's browser session only)
 *  - unknown (auth still loading) or storage unavailable: empty, no writes.
 * Unscoped legacy keys are deleted, never migrated to any identity.
 */
const USER_PREFIX = "getpros.history.v2.user.";
const GUEST_KEY = "getpros.history.v2.guest";
export const LEGACY_KEYS = ["getpros.history.v1", ["snap", "it.history.v1"].join("")];

export type HistoryScope = { kind: "user"; userId: string } | { kind: "guest" } | null;

export type SnapHistoryEntry = {
  id: string;
  createdAt: number;
  note?: string;
  thumbnail: string;
  analysis: SnapAnalysis;
};

type Stores = { local: Storage | null; session: Storage | null };

function defaultStores(): Stores {
  if (typeof window === "undefined") return { local: null, session: null };
  let local: Storage | null = null;
  let session: Storage | null = null;
  try { local = window.localStorage; } catch { /* blocked */ }
  try { session = window.sessionStorage; } catch { /* blocked */ }
  return { local, session };
}

let storesOverride: Stores | null = null;
/** Test hook. */
export function __setStoresForTest(s: Stores | null) { storesOverride = s; }
const stores = () => storesOverride ?? defaultStores();

function purgeLegacy() {
  const { local } = stores();
  if (!local) return;
  for (const k of LEGACY_KEYS) {
    try { local.removeItem(k); } catch { /* ignore */ }
  }
}

function target(scope: HistoryScope): { store: Storage; key: string } | null {
  if (!scope) return null;
  const { local, session } = stores();
  if (scope.kind === "user") {
    if (!scope.userId || !local) return null;
    return { store: local, key: USER_PREFIX + scope.userId };
  }
  return session ? { store: session, key: GUEST_KEY } : null;
}

export function loadHistory(scope: HistoryScope): SnapHistoryEntry[] {
  purgeLegacy();
  const t = target(scope);
  if (!t) return [];
  try {
    const raw = t.store.getItem(t.key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(
  scope: HistoryScope,
  entry: Omit<SnapHistoryEntry, "id" | "createdAt">,
): SnapHistoryEntry {
  const full: SnapHistoryEntry = {
    ...entry,
    id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const t = target(scope);
  if (!t) return full;
  const list = [full, ...loadHistory(scope)].slice(0, 50);
  try { t.store.setItem(t.key, JSON.stringify(list)); } catch { /* quota */ }
  return full;
}

export function removeHistoryEntry(scope: HistoryScope, id: string) {
  const t = target(scope);
  if (!t) return;
  const list = loadHistory(scope).filter((e) => e.id !== id);
  try { t.store.setItem(t.key, JSON.stringify(list)); } catch { /* ignore */ }
}

export function clearHistory(scope: HistoryScope) {
  const t = target(scope);
  if (!t) return;
  try { t.store.removeItem(t.key); } catch { /* ignore */ }
}

/** Called when a user signs in so a previous guest's tab history can't linger. */
export function clearGuestHistory() {
  clearHistory({ kind: "guest" });
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
