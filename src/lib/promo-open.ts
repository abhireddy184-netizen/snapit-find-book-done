import { useSyncExternalStore } from "react";

/**
 * Whether the seasonal promo banner is currently on screen (not dismissed, not expired).
 * PromoBanner writes it; other floating CTAs read it to avoid a duplicate "Join as a Pro".
 */
let open = false;
const listeners = new Set<() => void>();

export function setPromoOpen(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePromoOpen() {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
