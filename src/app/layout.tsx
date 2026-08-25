import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerRegistration } from "@/components/app-shell/service-worker-registration";
import { CookieNotice } from "@/components/consent/cookie-notice";
import { SITE_URL } from "@/lib/site-url";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves relative Open Graph/Twitter image URLs (used by the public
  // landing, src/app/page.tsx) into absolute ones. Production (Vercel) must
  // set NEXT_PUBLIC_SITE_URL -- see src/lib/site-url.ts's own comment for
  // why this can't be hardcoded here.
  metadataBase: new URL(SITE_URL),
  title: "Sport Coach",
  description: "Entrenamiento guiado, planificado por rotación.",
  // `capable`/`statusBarStyle` cover iOS Safari versions that don't read
  // manifest.ts's `display: "standalone"` on their own; "black-translucent"
  // lets the app's own dark background (not a default white bar) show
  // behind the status bar -- consistent with the RAW PERFORMANCE identity,
  // not a new one invented for this file.
  appleWebApp: { capable: true, title: "Sport Coach", statusBarStyle: "black-translucent" },
};

/**
 * `themeColor`/`colorScheme` reuse the project's own dark-mode tokens
 * (globals.css) rather than a new value invented for the manifest.
 * `viewportFit: "cover"` is what actually lets `env(safe-area-inset-*)`
 * (already used by the bottom nav; Workout's own root padding was
 * extended to use it too this phase) extend correctly under a notch/
 * Dynamic Island/home indicator in standalone mode -- without it iOS
 * letterboxes the app inside the safe area instead and those env() values
 * always read as 0, regardless of what any component asks for.
 */
export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CookieNotice />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
