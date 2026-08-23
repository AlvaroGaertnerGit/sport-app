"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` exactly once, client-side, production builds
 * only -- `next dev`'s own dev server (HMR, fast refresh) has nothing to
 * do with a service worker and a stray registration from a dev session
 * has caused real "why isn't my change showing up" confusion in other
 * projects (brief §22 explicitly calls this out). No UI, no state --
 * purely a side effect, so this stays a tiny standalone component rather
 * than something bolted onto a component that renders something.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Never fatal -- the app must work identically with no service
      // worker at all (brief §16/§17's same "never a hard dependency"
      // rule the timers/audio already follow, applied here).
      console.error("[sport-coach] service worker registration failed:", error);
    });
  }, []);

  return null;
}
