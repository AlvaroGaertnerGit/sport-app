import Link from "next/link";
import type { ComponentProps } from "react";

/** Focus-ring shape shared by every interactive element in the app (color is added separately -- it varies by context, e.g. destructive). */
export const FOCUS_RING_CLASSNAME =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

/** Underlined inline text link (Auth's "¿No tienes cuenta? Regístrate" pattern) — not a Button variant, it sits inside a sentence rather than standing alone. */
export const TEXT_LINK_CLASSNAME = `font-medium text-foreground underline underline-offset-2 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

/** Rectangular, not pill -- "evitar botones excesivamente redondeados" per the brief. Text size/weight live per-variant below, not here: only a solid fill needs the large-text AA allowance (see `primary`). */
const BASE_CLASSNAME = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-6 transition-colors ${FOCUS_RING_CLASSNAME} disabled:cursor-not-allowed`;

const VARIANT_CLASSNAME = {
  /**
   * The one primary CTA per screen. text-xl/bold, not text-base/semibold:
   * white text on the primary red token measures 3.65:1, which only clears
   * WCAG AA at the "large text" threshold (>=18.66px bold, 3:1) -- not at
   * normal-text size (4.5:1). 20px bold clears that unambiguously without
   * darkening the brief's own accent value.
   */
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted text-xl font-bold",
  /** Secondary actions that must not compete with the primary CTA (nav, abandon) — a text-color contrast pair passes AA at any size, so this stays a step down in weight from primary. */
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground focus-visible:outline-primary disabled:text-muted-foreground/50 text-base font-semibold",
  /** The confirming half of a destructive confirmation (e.g. "Abandonar") — ghost weight, same red as primary, differentiated by form (outline/text) not hue. */
  "destructive-ghost":
    "bg-transparent text-destructive hover:text-destructive/80 focus-visible:outline-destructive disabled:text-destructive/50 text-base font-semibold",
} as const;

type ButtonVariant = keyof typeof VARIANT_CLASSNAME;

function buttonClassName(variant: ButtonVariant, className?: string) {
  const classes = `${BASE_CLASSNAME} ${VARIANT_CLASSNAME[variant]}`;
  return className ? `${classes} ${className}` : classes;
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

/** Action button — use when the click performs a mutation. */
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

/** Navigation button — use when the click just goes to another route. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}

/** Trailing arrow used on every dominant CTA in the reference ("EMPEZAR →") — aria-hidden, the button's own text already says what it does. */
export function ButtonArrow() {
  return (
    <span aria-hidden="true">
      →
    </span>
  );
}
