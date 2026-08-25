"use client";

import { motion } from "framer-motion";

import { Scope } from "@/components/scope/scope";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { useIsReducedMotion } from "@/hooks/use-is-reduced-motion";

export type BootLoadingPhase = "idle" | "preparing" | "ready";

/**
 * The real SCOPE character (src/components/scope/scope.tsx) — its own
 * canonical geometry, moods and idle personality, untouched. This wraps it
 * in one extra transform layer only: SCOPE's own root has no transform of
 * its own (that lives on an inner child), so an ancestor `motion.div` here
 * composes for free with everything SCOPE already animates internally
 * (breathing, blinks, occasional glances) rather than fighting it — the
 * same "external orchestrator" relationship scope.tsx's own `suspended`
 * prop doc describes, just applied a level higher instead of needing that
 * prop at all.
 *
 * "preparing"'s loop is deliberately mostly rest: SCOPE's own idle
 * breathing plays for the first half of every ~4s cycle, then one small,
 * slow knee-bend-style dip (translateY + a touch of scaleY/scaleX, no
 * spring/bounce) and back up. Never redrawn, no props/gear added — the
 * "doing sport" read comes entirely from that rhythm, not new geometry.
 *
 * "ready" reuses SCOPE's own existing `happy` mood verbatim (already a
 * self-resolving tiny hop+settle, see scope-motion.ts's
 * SCOPE_HAPPY_ANIMATE/SCOPE_HAPPY_HOLD_MS) rather than inventing a new
 * gesture — see this component's own README note in the boot-loading
 * report about why the Suspense-driven caller below never actually reaches
 * this phase today.
 */
const PREPARING_ANIMATE = {
  y: [0, 0, 5, 0, 0],
  scaleY: [1, 1, 0.95, 1, 1],
  scaleX: [1, 1, 1.02, 1, 1],
};

const PREPARING_TRANSITION = {
  duration: 4.2,
  times: [0, 0.5, 0.65, 0.8, 1],
  repeat: Infinity,
  ease: "easeInOut" as const,
};

const SETTLED_ANIMATE = { y: 0, scaleY: 1, scaleX: 1 };
const SETTLED_TRANSITION = { duration: 0.3, ease: "easeInOut" as const };

const MOOD_BY_PHASE = {
  idle: "idle",
  preparing: "idle",
  ready: "happy",
} as const;

export function BootLoading({
  phase = "preparing",
  label = "Preparando tu entrenamiento…",
}: {
  phase?: BootLoadingPhase;
  label?: string;
}) {
  const isReducedMotion = useIsReducedMotion();
  const wrapperAnimate = phase === "preparing" && !isReducedMotion ? PREPARING_ANIMATE : SETTLED_ANIMATE;
  const wrapperTransition = phase === "preparing" && !isReducedMotion ? PREPARING_TRANSITION : SETTLED_TRANSITION;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-6 py-16"
    >
      <motion.div animate={wrapperAnimate} transition={wrapperTransition}>
        <Scope mood={MOOD_BY_PHASE[phase]} className="size-24 md:size-28" />
      </motion.div>
      <p className={EYEBROW_CLASSNAME}>{label}</p>
    </div>
  );
}
