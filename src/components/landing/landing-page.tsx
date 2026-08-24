import { ScopeDockProvider } from "@/components/scope/companion";

import { Hero } from "./hero";
import { LandingFooter } from "./footer";
import { ScrollProgress } from "./motion/scroll-progress";
import { LandingNavbar } from "./navbar";
import { SectionAudience } from "./section-audience";
import { SectionCoach } from "./section-coach";
import { SectionCta } from "./section-cta";
import { SectionHow } from "./section-how";
import { SectionPricing } from "./section-pricing";
import { StorySection } from "./story-section";

/**
 * Composes the whole public landing (brief's PLANIFICA → ENTRENA → MEJORA →
 * ENTIENDE narrative, §6). Almost entirely Server Components -- the
 * navbar's mobile-menu toggle, the motion leaves (Reveal/Parallax/
 * ScrollProgress), and now `ScopeDockProvider` (Scope, the real companion
 * character -- src/components/scope/) are the only client code, each a
 * small, single-purpose island rather than one big client subtree.
 *
 * `ScopeDockProvider` wraps the existing four children instead of
 * replacing this div's own `flex min-h-dvh flex-col` -- its own stage div
 * gets `className="flex flex-1 flex-col"` so it becomes the one flex item
 * doing exactly what Navbar/ScrollProgress/main/Footer did as four direct
 * items before (main's `flex-1` still resolves against this stage, not the
 * outer div). Scope only ever "docks" from Hero onward -- see each
 * <ScopeDock> call site's own comment for why the navbar/footer keep the
 * static ScopeMark instead.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ScopeDockProvider className="flex flex-1 flex-col">
        <LandingNavbar />
        <ScrollProgress />
        <main className="flex-1">
          <Hero />

          <StorySection
            id="funcionalidades"
            eyebrow="Planifica"
            heading="Construye un plan que tenga sentido para ti."
            lead="Rotaciones reales, no calendarios rígidos. Rutinas, ejercicios y series editables en cualquier momento."
            points={[
              "Rotación de rutinas, no una semana fija.",
              "Busca en el catálogo real de ejercicios.",
              "Edita series, reps, peso o duración cuando quieras.",
            ]}
            screenshot={{ src: "/marketing/plan-editor.png", alt: "Editor de rutina real en Sport Coach" }}
            scopeDock={{ id: "story-planifica", mood: "idle", scale: 0.85 }}
          />

          <StorySection
            eyebrow="Entrena"
            heading="Durante el entrenamiento, tú solo tienes que entrenar."
            lead="Objetivos claros por serie, timers de ejercicio y de descanso, y registro con el pulgar."
            points={[
              "Smart Targets: sabes qué peso y reps tocan hoy.",
              "Timers de ejercicio y de descanso incorporados.",
              "Registrar una serie es un solo gesto.",
            ]}
            screenshot={{ src: "/marketing/workout.png", alt: "Pantalla de entrenamiento con Smart Target en Sport Coach" }}
            reverse
            scopeDock={{ id: "story-entrena", mood: "curious", scale: 0.85 }}
          />

          <StorySection
            eyebrow="Mejora"
            heading="No entrenes a ciegas."
            lead="Tu historial se convierte en información: qué ha subido, qué se ha estancado, qué toca ahora."
            points={[
              "Progreso real por ejercicio, no una sensación.",
              "Historial y calendario de cada sesión.",
              "Tendencias a 7 días, 30 días o desde el inicio.",
            ]}
            screenshot={{ src: "/marketing/progress.png", alt: "Resumen de progreso y constancia en Sport Coach" }}
            scopeDock={{ id: "story-mejora", mood: "observe", scale: 0.85 }}
          />

          <SectionCoach />
          <SectionHow />
          <SectionAudience />
          <SectionPricing />
          <SectionCta />
        </main>
        <LandingFooter />
      </ScopeDockProvider>
    </div>
  );
}
