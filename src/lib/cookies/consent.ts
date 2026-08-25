"use client";

import { LEGAL_VERSION } from "@/lib/legal/version";

/**
 * Real cookie inventory (docs/legal/cookie-inventory.md): one first-party
 * session cookie (Supabase Auth) plus a couple of functional localStorage
 * keys -- all strictly necessary, all exempt from prior consent under LSSI
 * art. 22.2. There is nothing optional to accept/reject today, so this
 * deliberately does NOT model a real "accept/reject" consent -- only an
 * acknowledgement that the notice was shown (the LSSI duty to *inform*
 * still applies even when consent doesn't). The shape is versioned so the
 * day a real optional category (analytics, ads) is added, this can grow
 * into actual per-category consent without a redesign -- see
 * CookieSettingsPanel's own comment.
 */
export const COOKIE_NOTICE_STORAGE_KEY = "sc-cookie-notice-ack";

export type CookieNoticeAck = {
  version: string;
  acknowledgedAt: string;
};

export function getCookieNoticeAck(): CookieNoticeAck | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieNoticeAck>;
    if (typeof parsed.version !== "string" || typeof parsed.acknowledgedAt !== "string") return null;
    return { version: parsed.version, acknowledgedAt: parsed.acknowledgedAt };
  } catch {
    // Private browsing / storage disabled -- treat as "not yet acknowledged", never fatal.
    return null;
  }
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when the underlying data hasn't changed (React compares by
// Object.is) -- getCookieNoticeAck() above allocates a fresh object every
// call, which would otherwise re-trigger a render every time and throw
// "Maximum update depth exceeded". This cache only allocates a new object
// when the raw localStorage string actually changes.
let cachedAckRaw: string | null | undefined;
let cachedAck: CookieNoticeAck | null = null;

export function getCookieNoticeAckSnapshot(): CookieNoticeAck | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedAckRaw) return cachedAck;
  cachedAckRaw = raw;
  cachedAck = getCookieNoticeAck();
  return cachedAck;
}

/** True when the ack on record matches the current cookie policy version -- a version bump (a real new category added) re-surfaces the notice. */
export function hasAcknowledgedCurrentCookieNotice(): boolean {
  return getCookieNoticeAck()?.version === LEGAL_VERSION;
}

export function acknowledgeCookieNotice(): void {
  try {
    const ack: CookieNoticeAck = { version: LEGAL_VERSION, acknowledgedAt: new Date().toISOString() };
    window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify(ack));
  } catch {
    // Nothing more to do if storage is unavailable -- the notice just reappears next visit.
  }
}

/** For "Configurar cookies" -> reset: clears the ack so the notice reappears, without affecting the strictly-necessary cookies/storage themselves (those aren't optional). */
export function resetCookieNotice(): void {
  try {
    window.localStorage.removeItem(COOKIE_NOTICE_STORAGE_KEY);
  } catch {
    // Ignore -- nothing to reset if storage was never available.
  }
}
