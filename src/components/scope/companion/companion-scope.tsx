"use client"

import * as React from "react"
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion"

import { Scope } from "@/components/scope/scope"
import { springs } from "@/lib/motion"
import { DEFAULT_SCOPE_DOCK_CONFIG } from "./scope-docks"
import { useScopeDockContext } from "./scope-dock-context"

interface CompanionScopeProps {
  stageRef: React.RefObject<HTMLDivElement | null>
}

// The one shared <Scope> instance for the whole site. <ScopeDock> leaves
// (scope-dock.tsx) only render placeholder slots inside sections — this
// component measures whichever dock is currently active
// (scope-dock-context.tsx) and travels there.
//
// Positioned with `position: absolute` + transform (x/y/scale/rotate)
// inside the shared stage, never `position: fixed` — Scope scrolls with
// the page like it actually lives at that spot, rather than clinging to a
// fixed viewport corner. Only transform/opacity ever animate here —
// width/height/top/left are never touched.
function CompanionScope({ stageRef }: CompanionScopeProps) {
  const {
    activeDockId,
    getDockElement,
    getDockConfig,
    isAcknowledging,
    isSceneTransitioning,
    sceneMood,
    registerScopeMotionValues,
  } = useScopeDockContext()
  const shouldReduceMotion = useReducedMotion()
  const hasPositioned = React.useRef(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const rotate = useMotionValue(0)

  // Hand these same motion values to ScopeDockContext so an external
  // orchestrator could animate them directly instead of duplicating this
  // positioning mechanism. Identity is stable for the component's
  // lifetime, so registering once on mount is enough.
  React.useLayoutEffect(() => {
    registerScopeMotionValues({ x, y, scale, rotate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dockConfig = activeDockId ? getDockConfig(activeDockId) : DEFAULT_SCOPE_DOCK_CONFIG
  // While an orchestrator has commandeered Scope, mood is forced to
  // `sceneMood` (defaults to "observe" — lean-forward, wider eyes, the same
  // body language a settle-in resting mood already reads as "focused") —
  // rather than whatever dock/acknowledge state happened to be active when
  // the sequence began.
  const mood = isSceneTransitioning ? sceneMood : isAcknowledging ? "curious" : dockConfig.mood

  // Runs synchronously before paint (useLayoutEffect, not useEffect) so the
  // very first render never flashes at the (0,0) default before jumping to
  // the first dock — see scope-dock.tsx's own registration effect for why
  // that's also a layout effect, for the same reason.
  React.useLayoutEffect(() => {
    // While the theme-transition curtain sequence owns Scope's position,
    // this effect stands down entirely rather than fighting the sequence's
    // own animate() calls on the same motion values. It's in the dep array
    // below, so ending the transition re-runs this effect — a no-op
    // re-sync, since the sequence always restores Scope to exactly this
    // same target before releasing control.
    if (isSceneTransitioning) return

    const stage = stageRef.current
    const dock = activeDockId ? getDockElement(activeDockId) : null
    if (!stage || !dock) return

    const stageRect = stage.getBoundingClientRect()
    const dockRect = dock.getBoundingClientRect()
    const targetX = dockRect.left - stageRect.left
    const targetY = dockRect.top - stageRect.top
    const targetScale = dockConfig.scale
    const targetRotate = dockConfig.facing

    const instant = !hasPositioned.current || shouldReduceMotion
    hasPositioned.current = true

    if (instant) {
      x.set(targetX)
      y.set(targetY)
      scale.set(targetScale)
      rotate.set(targetRotate)
      return
    }

    // "Heavy. Calm. Intentional." — springs.companion (src/lib/motion.ts)
    // is deliberately much slower/heavier than an ordinary UI-facing spring.
    animate(x, targetX, springs.companion)
    animate(y, targetY, springs.companion)
    animate(scale, targetScale, springs.companion)
    animate(rotate, targetRotate, springs.companion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDockId, dockConfig.scale, dockConfig.facing, isSceneTransitioning])

  // Re-measure on resize (a reflow can move a dock without activeDockId
  // ever changing) — always instant, resizing the window isn't a moment
  // that should trigger a "travel" animation. Skipped while the theme
  // sequence owns Scope's position, for the same reason as the effect above.
  React.useEffect(() => {
    function onResize() {
      if (isSceneTransitioning) return
      const stage = stageRef.current
      const dock = activeDockId ? getDockElement(activeDockId) : null
      if (!stage || !dock) return
      const stageRect = stage.getBoundingClientRect()
      const dockRect = dock.getBoundingClientRect()
      x.set(dockRect.left - stageRect.left)
      y.set(dockRect.top - stageRect.top)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [activeDockId, getDockElement, stageRef, x, y, isSceneTransitioning])

  return (
    <motion.div
      aria-hidden="true"
      data-slot="companion-scope"
      className="pointer-events-none absolute top-0 left-0 z-30 origin-top-left"
      style={{ x, y, scale, rotate }}
    >
      <Scope
        mood={mood}
        attentionTarget={dockConfig.attentionTarget}
        suspended={isSceneTransitioning}
        resetSignal={activeDockId}
        className="size-40 sm:size-48"
      />
    </motion.div>
  )
}

export { CompanionScope }
