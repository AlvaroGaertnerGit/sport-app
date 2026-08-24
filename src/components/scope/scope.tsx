"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/cn"
import { useScopePersonality } from "./personality/use-scope-personality"
import {
  SCOPE_ACCENT_DOT,
  SCOPE_ANTENNA_PATH,
  SCOPE_ANTENNA_TIP,
  SCOPE_DISPLAY_PATH,
  SCOPE_DISPLAY_SHEEN,
  SCOPE_EYE_LEFT,
  SCOPE_EYE_RIGHT,
  SCOPE_FEET,
  SCOPE_GLOW_RECT,
  SCOPE_MOUTH_GLOW,
  SCOPE_MOUTH_MAIN,
  SCOPE_SHELL,
  SCOPE_SHELL_SHEEN,
  SCOPE_VIEWBOX,
} from "./scope-geometry"
import { SCOPE_GLOW_TRANSITION } from "./scope-motion"
import type { ScopeMood } from "./scope.types"
import { useCombinedMotionValue } from "./use-combined-motion-value"
import { useScopeMotion } from "./use-scope-motion"
import { useScopePresence } from "./use-scope-presence"

// Scope — Sport Coach's companion. Canonical source: docs/scope/ (read
// those before changing anything about Scope's identity). This file is a
// near-verbatim port of the reference implementation in
// docs/scope/scope/scope/scope.tsx — only the `cn` import path changed to
// match this project's own tiny local helper (src/lib/cn.ts). The one
// deliberate visual change anywhere in Scope is a CSS token, not this
// file: `--scope-warm` is tied to Sport Coach's own `--primary` red instead
// of the reference's amber (globals.css) — nothing about geometry, timing,
// springs, or gesture logic differs from the source.
//
// A client component — it animates.
//
// Deliberately a pure function of `mood`: no callback props, no internal
// mood state. Whoever controls mood (CompanionScope, CoachChat, etc.) owns
// any lifecycle logic — e.g. "happy" resolving itself back to "idle" — see
// SCOPE_HAPPY_HOLD_MS in scope-motion.ts.
//
// Three independent layers compose here, each owning a different concern
// (Motion: how mood animates; Presence: cursor interaction; Personality:
// autonomous idle behaviour) — none of the three hooks knows about the
// other two; this component is the one place they're combined:
//
// - Mood (useScopeMotion) drives the body's `animate` (scale/rotate/y —
//   the idle breathing loop keeps running underneath) and each eye's
//   resting `scaleY` expression (`eyeScaleY`).
// - Presence (useScopePresence) drives cursor-derived `style` values:
//   body tilt (rotateX/rotateY), the eyes' gaze position (eyeX/eyeY, plus
//   a tiny always-on jitter baked in), the antenna's reactive sway
//   (antennaRotate), and the accent dot's proximity-based visibility
//   (interactionIntensity).
// - Personality (useScopePersonality) drives occasional idle gestures:
//   rotate/y/scale on the body, blinkScaleY on the eyes (multiplicative
//   with mood's own eyeScaleY — see the nested <motion.g> below, not a
//   useTransform combinator, since mood's eyeScaleY isn't a MotionValue),
//   eyeOffsetX/Y and eyeConverge on the eyes' gaze (additive with
//   presence's eyeX/eyeY), and antennaFlex on the antenna. Personality
//   also takes this component's own `ref` plus the optional
//   `attentionTarget` prop below, so it can occasionally aim eyeOffsetX/Y
//   at a registered point of interest instead of a scripted offset — still
//   the same eyeOffsetX/Y channel, no new composition wiring needed here.
//   Personality also exposes `touch()`, wired to onClick on the
//   shell/display shapes below — the "trust" interaction (notice →
//   suppressed bounce → full stretch across repeated touches) plays over
//   these exact same rotate/y/scale/blinkScaleY/antennaFlex channels, so
//   nothing here composes any differently whether a reaction came from the
//   autonomous scheduler or a direct touch.
//
// Framer merges every transform-shaped style key (x, y, rotate, rotateX,
// rotateY, scale, scaleY, ...) on one style object into a single CSS
// transform automatically, so values from different hooks compose for
// free as long as they don't share a key name; where two independent
// values need to affect the *same* property (eye position, eye scaleY),
// they're combined explicitly below via useTransform (additive) or nested
// elements (multiplicative) — see the comments at each call site for why
// one technique was used over the other.
function Scope({
  mood = "idle",
  attentionTarget,
  suspended = false,
  resetSignal,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  mood?: ScopeMood
  /** An element Personality may occasionally glance toward — see use-scope-personality.ts. */
  attentionTarget?: React.RefObject<Element | null>
  /**
   * True while an external orchestrator has commandeered Scope — pauses
   * idle gestures (Personality) and cursor gaze tracking (Presence) so
   * nothing fights that orchestrator's own animation of Scope's wrapper
   * transform. Mood is still externally owned as always; the caller is
   * expected to also override `mood` while this is true.
   */
  suspended?: boolean
  /**
   * An identity that changes when Scope has "moved on" — in practice the
   * active dock id — resetting the touch/"trust" familiarity progression
   * back to shy. See useScopePersonality's own comment on this same
   * parameter for why it's a plain optional value, not context.
   */
  resetSignal?: string | null
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const {
    rotate: personalityRotate,
    y: personalityY,
    scale: personalityScale,
    blinkScaleY,
    eyeOffsetX,
    eyeOffsetY,
    eyeConverge,
    antennaFlex,
    isStill,
    touch,
  } = useScopePersonality(ref, attentionTarget, suspended, resetSignal)
  // "The Stillness Moment": Personality decides *when* Scope goes still;
  // Motion (here) is what actually owns the breathing loop and decides
  // what that looks like — see useScopeMotion's own comment for why this
  // crosses the two layers' usual independence deliberately, in one
  // direction only.
  const { animate, transition, glow, eyeScaleY } = useScopeMotion(mood, isStill)
  const {
    rotateX,
    rotateY,
    eyeX,
    eyeY,
    parallaxX,
    parallaxY,
    shadowX,
    shadowY,
    shadowScaleX,
    antennaRotate,
    interactionIntensity,
  } = useScopePresence(ref, suspended)

  // Additive: presence's continuous gaze position + personality's
  // occasional look-up/down nudge. Both are real MotionValues — combined
  // via useCombinedMotionValue (see that file for why).
  const gazeX = useCombinedMotionValue([eyeX, eyeOffsetX], ([a, b]) => a + b)
  const gazeY = useCombinedMotionValue([eyeY, eyeOffsetY], ([a, b]) => a + b)
  // Convergence nudges each eye in an OPPOSITE direction from the shared
  // gaze — left eye inward is +x (toward center), right eye inward is −x.
  const leftEyeX = useCombinedMotionValue([gazeX, eyeConverge], ([a, b]) => a + b)
  const rightEyeX = useCombinedMotionValue([gazeX, eyeConverge], ([a, b]) => a - b)

  const mouthX = useCombinedMotionValue([gazeX], ([x]) => x * 0.3)
  const mouthY = useCombinedMotionValue([gazeY], ([y]) => y * 0.25)

  return (
    <div
      ref={ref}
      data-slot="scope"
      data-scope-mood={mood}
      aria-hidden="true"
      className={cn("relative", className)}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        style={{ x: shadowX, y: shadowY, scaleX: shadowScaleX }}
        className="bg-scope-shell/30 absolute inset-6 -z-10 rounded-full blur-2xl"
      />
      <motion.div
        style={{
          rotateX,
          rotateY,
          rotate: personalityRotate,
          y: personalityY,
          scale: personalityScale,
          transformPerspective: 600,
        }}
        className="h-full w-full"
      >
        <motion.div animate={animate} transition={transition} className="h-full w-full">
        <svg viewBox={SCOPE_VIEWBOX} className="h-full w-full">
          <defs>
            <linearGradient id="scope-shell-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--scope-shell)" />
              <stop
                offset="100%"
                stopColor="color-mix(in oklch, var(--scope-shell), var(--scope-details) 16%)"
              />
            </linearGradient>
          </defs>

          {/* display glow — brightens/dims per mood, warm (--scope-warm)
              since the face is the light source, not a neutral panel with
              an accent trim. */}
          <motion.rect
            {...SCOPE_GLOW_RECT}
            className="fill-scope-warm blur-md"
            initial={false}
            animate={{ opacity: glow * 0.5 }}
            transition={SCOPE_GLOW_TRANSITION}
            style={{ x: parallaxX, y: parallaxY }}
          />

          {/* feet */}
          <rect {...SCOPE_FEET[0]} className="fill-scope-details" />
          <rect {...SCOPE_FEET[1]} className="fill-scope-details" />

          {/* shell — a soft top-to-bottom shade plus a hairline edge
              stroke, so it stays legible even against a near-white
              background in light mode. A very slightly flattened ellipse
              (rx > ry) rather than a perfect circle — "almost spherical,
              slightly flattened at the bottom." Also the touch
              interaction's click surface — see the display path below for
              the other half of it. No `cursor: pointer` anywhere on
              purpose — a hand cursor would read as "clickable UI," which
              this deliberately isn't; it should only ever be discovered. */}
          <ellipse
            {...SCOPE_SHELL}
            fill="url(#scope-shell-gradient)"
            stroke="var(--scope-details)"
            strokeOpacity="0.1"
            strokeWidth="2"
            style={{ pointerEvents: "auto" }}
            onClick={touch}
          />

          {/* a soft top sheen suggesting a sculpted, matte-ceramic shell
              surface — deliberately faint and tucked near the top edge so
              it never competes with the face below it. */}
          <ellipse {...SCOPE_SHELL_SHEEN} className="fill-scope-shell" opacity="0.12" />

          {/* antenna — tiny, elegant, flexible, a subtle indicator of
              attention. A sibling of the display group, not nested inside
              it: the display group's parallaxX/Y is specifically the
              "recessed glass" depth cue for the face; the antenna is an
              external shell feature and doesn't need that cue. Two nested
              groups compose two independent rotations with no combinator
              needed (rotation adds across nested transforms) — outer is
              presence's continuous, physically-lagging sway; inner is
              personality's occasional idle flex. Both pivot from the
              antenna's own base (percentage origin relative to this
              group's own bounding box) rather than an absolute canvas
              coordinate. */}
          <motion.g style={{ rotate: antennaRotate, transformOrigin: "50% 100%" }}>
            <motion.g style={{ rotate: antennaFlex, transformOrigin: "50% 100%" }}>
              <path
                d={SCOPE_ANTENNA_PATH}
                stroke="var(--scope-details)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                {...SCOPE_ANTENNA_TIP}
                className="fill-scope-shell"
                stroke="var(--scope-details)"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            </motion.g>
          </motion.g>

          {/* accent light — the one remaining trace of Scope's purple
              accent — "extremely subtle atmospheric purple only when
              interacting with the environment" — driven by presence's
              interactionIntensity (0 at rest, before any interaction; rises
              only as the cursor comes close), not mood's glow — this is
              deliberately not an always-on decorative dot. Shown via
              `scale`, not `opacity` (see the reference implementation's
              own note on why — a raw MotionValue bound to SVG `opacity`
              didn't reliably update on this stack, while transform-family
              properties do). */}
          <motion.circle
            {...SCOPE_ACCENT_DOT}
            className="fill-scope-accent"
            style={{ scale: interactionIntensity }}
          />

          {/* display + eyes, grouped so they always move together (the
              display is part of the shell — it rotates with the body
              above, never independently) with a much smaller secondary
              shift of its own for a sense of depth, like glass set
              slightly back from its bezel. */}
          <motion.g style={{ x: parallaxX, y: parallaxY }}>
            {/* a faint inner-edge stroke suggests the display sits
                recessed into the shell rather than flush with it. The
                other half of the touch click surface, see the shell
                ellipse's own comment above. */}
            <path
              d={SCOPE_DISPLAY_PATH}
              className="fill-scope-display stroke-scope-details"
              strokeOpacity="0.35"
              strokeWidth="1"
              style={{ pointerEvents: "auto" }}
              onClick={touch}
            />

            {/* a soft, low-opacity diagonal highlight — just enough to
                read as glossy ("almost mirror-like") without becoming an
                actual reflection. */}
            <ellipse
              cx={SCOPE_DISPLAY_SHEEN.cx}
              cy={SCOPE_DISPLAY_SHEEN.cy}
              rx={SCOPE_DISPLAY_SHEEN.rx}
              ry={SCOPE_DISPLAY_SHEEN.ry}
              transform={`rotate(${SCOPE_DISPLAY_SHEEN.rotationDeg} ${SCOPE_DISPLAY_SHEEN.cx} ${SCOPE_DISPLAY_SHEEN.cy})`}
              className="fill-scope-shell blur-sm"
              opacity="0.07"
            />

            {/* the eyes — Scope's primary expression channel. Two plain
                pill shapes, never a curve, a star, or a shape swap —
                expression lives in scaleY (mood's resting eyeScaleY,
                multiplied by personality's transient blinkScaleY for
                blinks/squint/widen — see the nested <motion.g> below) and
                shared gaze position (presence's continuous eyeX/eyeY,
                plus personality's occasional look-up/down and
                convergence, all additive). No eyebrows, no eyelids, no
                iris/pupil detail, no mouth, geometric and timed, not
                realistic. Each eye also gets a soft blurred "bloom"
                behind it, distinct from the ambient face-wide glow rect
                above. */}
            <motion.g style={{ x: leftEyeX, y: gazeY }}>
              <motion.g style={{ scaleY: blinkScaleY }}>
                <rect {...SCOPE_EYE_LEFT.bloom} className="fill-scope-warm blur-sm" opacity={0.4} />
                <motion.rect
                  {...SCOPE_EYE_LEFT.main}
                  className="fill-scope-warm"
                  initial={false}
                  animate={{ scaleY: eyeScaleY }}
                  transition={transition}
                />
              </motion.g>
            </motion.g>
            <motion.g style={{ x: rightEyeX, y: gazeY }}>
              <motion.g style={{ scaleY: blinkScaleY }}>
                <rect {...SCOPE_EYE_RIGHT.bloom} className="fill-scope-warm blur-sm" opacity={0.4} />
                <motion.rect
                  {...SCOPE_EYE_RIGHT.main}
                  className="fill-scope-warm"
                  initial={false}
                  animate={{ scaleY: eyeScaleY }}
                  transition={transition}
                />
              </motion.g>
            </motion.g>
            <motion.g
              style={{x: mouthX, y: mouthY, scaleY: blinkScaleY }}
              animate={{
                y: mood === "happy" ? -1 : 0,
              }}
              transition={transition}
            >
              {/* mouth glow */}
              <rect {...SCOPE_MOUTH_GLOW} className="fill-scope-warm blur-sm" opacity={0.22} />

              {/* mouth */}
              <motion.rect
                {...SCOPE_MOUTH_MAIN}
                className="fill-scope-warm"
                initial={false}
                animate={{
                  scaleX:
                    mood === "thinking"
                      ? 0.82
                      : mood === "happy"
                      ? 1.18
                      : mood === "curious"
                      ? 1.08
                      : 1,

                  scaleY:
                    mood === "thinking"
                      ? 0.85
                      : mood === "happy"
                      ? 1.05
                      : 1,

                  opacity: 1,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              />
            </motion.g>
          </motion.g>
        </svg>
        </motion.div>
      </motion.div>
    </div>
  )
}

export { Scope }
