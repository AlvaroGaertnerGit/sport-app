/**
 * Single source of truth for "which version of Terms/Privacy did the user
 * accept" (brief: consent must be provable -- what, when, which version).
 * Bump this whenever /legal/terminos or /legal/privacidad materially
 * change; the new value is what gets written to consent_log for every
 * sign-up from that point on, and what the legal pages themselves display
 * as "última actualización".
 */
export const LEGAL_VERSION = "2026-08-25";

/** Human-readable form of LEGAL_VERSION for display on the /legal pages -- keep the two in sync when bumping. */
export const LEGAL_VERSION_DISPLAY = "25 de agosto de 2026";
