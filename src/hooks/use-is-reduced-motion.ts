"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Every ported Scope hook (use-scope-motion.ts, use-scope-presence.ts,
 * use-scope-personality.ts) imports this exact name/path from the reference
 * project. `companion-scope.tsx` uses framer-motion's own `useReducedMotion`
 * directly instead -- both read the same OS setting, just via a different
 * mechanism, matching the reference implementation file-for-file.
 */
export function useIsReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
