// Five moods only — see PERSONALITY.md's documented emotional states plus
// the reference sheet's Observe pose. Don't add a sixth without checking it
// against these for redundancy or personality drift first.
export type ScopeMood = "idle" | "curious" | "thinking" | "observe" | "happy"

// The nominal target this mood animates toward.
export interface ScopeMotionSpec {
  animationName: string
  scale: number
  rotate: number
  y: number
  /** 0–1, how bright the display/core reads. */
  glow: number
  /** Multiplier on each eye's base height — the "squint ↔ widen" expression axis. 1 = neutral. */
  eyeScaleY: number
}
