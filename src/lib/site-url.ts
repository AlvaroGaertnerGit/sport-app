/**
 * The app's own canonical origin -- the one place this is read from env,
 * reused wherever an absolute URL must be built server-side (email
 * confirmation `emailRedirectTo`, Open Graph image resolution in
 * layout.tsx). Falls back to localhost for local dev only; production
 * (Vercel) must set `NEXT_PUBLIC_SITE_URL` in Project Settings ->
 * Environment Variables -- without it, absolute URLs built from this
 * silently fall back to localhost even in a production deployment.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
