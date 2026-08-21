import type { ReactNode } from "react";

/**
 * The one inline error treatment, shared by Auth (field + form errors) and
 * Workout (log/complete/abandon action errors) -- extracted once the same
 * `role="alert"` + warning-glyph + fade-in JSX had been copy-pasted into six
 * call sites (this project's own "regla de tres" for a shared constant/
 * component, see typography.ts). The glyph is `aria-hidden` -- a screen
 * reader should hear the error message, not "warning sign".
 */
export function ErrorText({
  children,
  id,
  center = false,
}: {
  children: ReactNode;
  id?: string;
  center?: boolean;
}) {
  return (
    <p id={id} role="alert" className={`animate-fade-in text-sm text-destructive ${center ? "text-center" : ""}`}>
      <span aria-hidden="true">⚠ </span>
      {children}
    </p>
  );
}
