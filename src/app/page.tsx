import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * `/` is now the public landing (previous phase's "product landing" brief)
 * -- but an authenticated visitor (a returning user, or the installed PWA's
 * own `start_url: "/"`, see manifest.ts) must still land on /today exactly
 * like before, not see marketing copy every time they open the app. Only
 * an unauthenticated visitor sees the landing itself. proxy.ts's
 * PROTECTED_ROUTE_PREFIXES deliberately never included "/", so this needed
 * no middleware change.
 */
export const metadata: Metadata = {
  title: "Sport Coach — Entrena con intención.",
  description:
    "Planificación por rotación, entrenamiento guiado, progreso real y un Coach IA — en una única aplicación.",
  openGraph: {
    title: "Sport Coach — Entrena con intención.",
    description:
      "Planificación por rotación, entrenamiento guiado, progreso real y un Coach IA — en una única aplicación.",
    images: ["/icon-512.png"],
  },
};

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/today");
  }

  return <LandingPage />;
}
