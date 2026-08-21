import type { ComponentProps } from "react";

import { FOCUS_RING_CLASSNAME } from "./button";

/**
 * Underline field, not a boxed input -- matches the editorial Auth
 * composition in the design reference (EMAIL / ────── / PASSWORD / ──────).
 * `aria-invalid:border-destructive` gives the field itself a visible error
 * state (not just the message below it) the moment a form sets
 * `aria-invalid` -- no separate error-state prop to keep in sync.
 */
const INPUT_CLASSNAME = `min-h-11 w-full border-0 border-b-2 border-border bg-transparent px-0 py-3 text-lg text-foreground placeholder:text-muted-foreground transition-colors duration-150 ${FOCUS_RING_CLASSNAME} focus-visible:border-primary focus-visible:outline-primary aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50`;

type InputProps = ComponentProps<"input">;

/** Base text input — pair with a sibling `<label htmlFor>` for the field name. */
export function Input({ className, ...props }: InputProps) {
  const classes = className ? `${INPUT_CLASSNAME} ${className}` : INPUT_CLASSNAME;
  return <input className={classes} {...props} />;
}
