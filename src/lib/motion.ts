import type { Transition } from "framer-motion";

// Motion constants for the ported Scope character system
// (src/components/scope/) -- the reference implementation imports these
// from its own project's `@/lib/motion`, which doesn't exist here.

export const springs = {
  /**
   * The dock-to-dock travel spring (companion-scope.tsx): "Heavy. Calm.
   * Intentional." -- deliberately much slower/heavier than an ordinary
   * UI-facing spring. Low stiffness + high mass reads as a real walk
   * between rooms, never a snap to the next section.
   */
  companion: { type: "spring", stiffness: 40, damping: 20, mass: 2 } as const,
} satisfies Record<string, Transition>;

export const transitions = {
  /** ScopeGreeting's one-time fade-in/out -- slow and quiet, never a UI toast. */
  enterSlow: { duration: 0.6, ease: "easeOut" } as const,
} satisfies Record<string, Transition>;
