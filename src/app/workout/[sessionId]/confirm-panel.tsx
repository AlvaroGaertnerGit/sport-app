import type { ReactNode } from "react";

/**
 * The one confirm/cancel layout shared by the three places Workout asks
 * "are you sure?" (skip exercise, finish with pending work, abandon).
 * Deliberately dumb: callers bring their own cancel/confirm buttons
 * (a plain button for a client-only action, a `<form>` around a submit
 * button for a Server Action) — this only owns the message + layout.
 */
export function ConfirmPanel({
  message,
  cancelButton,
  confirmButton,
}: {
  message: ReactNode;
  cancelButton: ReactNode;
  confirmButton: ReactNode;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex animate-scale-in flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="text-sm text-foreground">{message}</div>
      <div className="flex gap-3">
        <div className="flex-1">{cancelButton}</div>
        <div className="flex-1">{confirmButton}</div>
      </div>
    </div>
  );
}
