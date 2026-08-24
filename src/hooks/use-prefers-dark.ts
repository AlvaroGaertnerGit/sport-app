"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  // This app's dark mode is pure `prefers-color-scheme` (no theme toggle,
  // no next-themes) -- globals.css's own dark block is the source of truth,
  // this just mirrors it in JS for the one place Scope's own motion (idle
  // breathing duration) varies by theme. Defaulting false on the server is
  // harmless: it only ever nudges a breathing-loop duration by ~0.4s, never
  // affects layout, so no hydration flash is possible.
  return false;
}

/** Replaces the reference implementation's `next-themes` `useTheme()` -- see use-scope-motion.ts. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
