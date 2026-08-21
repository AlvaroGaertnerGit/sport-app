/**
 * RAW PERFORMANCE deliberately avoids "card-thinking" (see the design
 * reference) -- Today, Workout and Auth are built from spacing, type and
 * thin dividers instead. This surface still exists for the one place that
 * legitimately needs a bounded, raised surface: ConfirmPanel's
 * are-you-sure interruptions. Flat (no shadow), a thin border, minimal
 * radius -- a line, not a box with a shadow under it.
 */
export const CARD_CLASSNAME = "rounded-md border border-border bg-elevated p-5";

/** Compose the surface with layout-specific classes — same pattern as button.tsx's buttonClassName(). */
export function cardClassName(extra?: string) {
  return extra ? `${CARD_CLASSNAME} ${extra}` : CARD_CLASSNAME;
}
