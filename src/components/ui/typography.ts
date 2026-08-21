/**
 * The two type treatments repeated across Today/Workout/Auth (see
 * docs/style-reference) — extracted once these hit the project's own
 * "regla de tres" for a shared constant (button.tsx/card.tsx set the
 * precedent), same as CARD_CLASSNAME.
 */

/** Small uppercase mono label ("SPORT COACH", "¿QUÉ TOCA HOY?", "DESCANSO"). */
export const EYEBROW_CLASSNAME = "font-mono text-xs tracking-widest text-muted-foreground uppercase";

/**
 * The dominant display heading (routine name, exercise name, Auth h1).
 * Callers still supply their own `style={{ fontSize: "clamp(...)" }}` --
 * the clamp range differs per context (a routine name reads bigger than a
 * login h1), so only the shared shape (weight, case, leading, tracking)
 * lives here, not the size.
 */
export const DISPLAY_HEADING_CLASSNAME =
  "font-sans font-black text-foreground uppercase leading-none tracking-tight text-balance";
