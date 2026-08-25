import { BootLoading } from "@/components/app-shell/boot-loading";

/**
 * Today is the app's real entry point (manifest.ts's `start_url: "/"`
 * redirects here) — this is the Suspense fallback Next.js shows for
 * exactly as long as TodayPage's own async body (requireUser + profile +
 * getTodayRecommendation) takes, no more, no less: no artificial minimum,
 * no timer. See docs' app-boot investigation notes for why this used to be
 * a generic skeleton and now uses SCOPE instead.
 */
export default function TodayLoading() {
  return <BootLoading phase="preparing" />;
}
