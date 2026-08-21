import Link from "next/link";
import type { ComponentProps } from "react";

const BASE_CLASSNAME =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

const VARIANT_CLASSNAME = {
  /** The one primary CTA per screen. */
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted",
  /** Secondary actions that must not compete with the primary CTA (nav, abandon). */
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground focus-visible:outline-primary disabled:text-muted-foreground/50",
  /** The confirming half of a destructive confirmation (e.g. "Abandonar") — still secondary-weight, never the loud primary green. */
  "destructive-ghost":
    "bg-transparent text-destructive hover:text-destructive/80 focus-visible:outline-destructive disabled:text-destructive/50",
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
