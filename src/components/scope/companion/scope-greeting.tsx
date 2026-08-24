"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { transitions } from "@/lib/motion"
import { cn } from "@/lib/cn"

// The session key deliberately lives in sessionStorage, not localStorage —
// "once per this browsing session," not "once ever." A new tab (or the
// browser closing) is a new introduction.
const GREETING_STORAGE_KEY = "scope:greeted"

const SHOW_DELAY_MS = 1000
const HOLD_MS = 2000
// Matches transitions.enterSlow's own duration (600ms) plus a small buffer
// — the unmount below waits for the fade-out to actually finish rather than
// cutting it off mid-transition.
const FADE_MS = 700

// The one and only exception to "Scope never speaks." Deliberately NOT
// part of the mood/personality system: Scope's own mood stays untouched
// throughout (it remains visually idle) — the text does the introducing,
// per Scope's own restraint principle that it doesn't perform reactions to
// its own actions. A plain, quiet caption near Scope's Hero dock — no
// background, border, or tail, so it never reads as a chat bubble or
// speech balloon.
//
// Driven by two states rather than framer-motion's own `initial`/`exit`
// (AnimatePresence): verified empirically in this stack (framer-motion
// 13.1.1 + React 19 + Turbopack) that a mount-time transition from an
// explicit `initial` value to a different `animate` value never actually
// plays — the element gets stuck at its `initial` value indefinitely, and
// the same dead-on-arrival behaviour affects AnimatePresence's own `exit`.
// A `animate` value CHANGING on an already-mounted element, by contrast,
// tweens correctly (the same mechanism this file's sibling components use
// for mood transitions). So `mounted` gates whether the node exists at all
// (starts false, renders at rest with `animate={{opacity:0}}` on its own
// first frame — no tween needed there, nothing to animate FROM yet), and
// `shown` flips true one frame later, turning the 0→1 fade into a genuine
// prop-value update on a node that's already in the tree — the pattern
// that's proven to work.
function ScopeGreeting({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (sessionStorage.getItem(GREETING_STORAGE_KEY)) return

    const showTimer = window.setTimeout(() => {
      setMounted(true)
      sessionStorage.setItem(GREETING_STORAGE_KEY, "1")
    }, SHOW_DELAY_MS)

    return () => window.clearTimeout(showTimer)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const raf = requestAnimationFrame(() => setShown(true))
    const hideTimer = window.setTimeout(() => setShown(false), HOLD_MS)
    const unmountTimer = window.setTimeout(() => setMounted(false), HOLD_MS + FADE_MS)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(hideTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <motion.p
      data-slot="scope-greeting"
      animate={{ opacity: shown ? 1 : 0 }}
      transition={transitions.enterSlow}
      className={cn(
        "pointer-events-none text-center text-sm font-medium tracking-wide text-balance text-muted-foreground",
        className
      )}
    >
      Hola. Soy Scope.
    </motion.p>
  )
}

export { ScopeGreeting }
