import "server-only";

/**
 * A deliberately simple per-user sliding-window limiter (brief §29: "no
 * necesitamos un sistema completo de billing... pero sí evitar una llamada
 * ilimitada accidental"). In-memory, module-scoped -- resets on server
 * restart and does not share state across multiple server instances. That
 * is a real limitation for a production multi-instance deployment (see
 * the phase report's Known limitations), not a hidden bug: this is
 * explicitly the "sencilla" protection the brief asked for, not a
 * distributed rate limiter.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

const requestLog = new Map<string, number[]>();

export function checkCoachRateLimit(userId: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (requestLog.get(userId) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    requestLog.set(userId, timestamps);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return { allowed: true };
}
