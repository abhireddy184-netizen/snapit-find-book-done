import { useEffect, useMemo } from "react";
import { useAuth } from "./auth";
import { clearGuestHistory, type HistoryScope } from "./snap-history";

/** null while auth is resolving, so nobody's entries flash during transitions. */
export function useHistoryScope(): HistoryScope {
  const { loading, user } = useAuth();
  const userId = user?.id ?? null;
  const scope = useMemo<HistoryScope>(
    () => (loading ? null : userId ? { kind: "user", userId } : { kind: "guest" }),
    [loading, userId],
  );
  useEffect(() => {
    if (userId) clearGuestHistory();
  }, [userId]);
  return scope;
}

export function scopeKey(scope: HistoryScope) {
  return scope ? (scope.kind === "user" ? `u:${scope.userId}` : "guest") : "none";
}
