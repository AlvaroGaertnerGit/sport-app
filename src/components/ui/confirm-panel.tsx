"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cardClassName } from "@/components/ui/card";

/**
 * The one confirm/cancel layout shared by every "are you sure?" moment in
 * the app (Workout's skip/finish/abandon, Profile's logout, Plan's
 * archive/remove) — moved here from `workout/[sessionId]/` once a third
 * unrelated feature needed it. Deliberately dumb: callers bring their own
 * cancel/confirm buttons (a plain button for a client-only action, a
 * `<form>` around a submit button for a Server Action) — this only owns
 * the message + layout.
 *
 * Two small pieces of keyboard/focus behavior live here rather than per
 * call site, since every caller needs the same thing: moving focus into
 * the panel when it appears (a keyboard user shouldn't have to hunt for
 * it), and letting Escape back out of it the same way tapping "Cancelar"
 * does -- without turning this into a real focus-trapped modal, which the
 * design direction explicitly rules out ("no convertirlos en modales
 * enormes").
 */
export function ConfirmPanel({
  message,
  cancelButton,
  confirmButton,
  onCancel,
}: {
  message: ReactNode;
  cancelButton: ReactNode;
  confirmButton: ReactNode;
  /** Called on Escape, if the caller wants that to act like "Cancelar". */
  onCancel?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
  }, []);

  return (
    <div
      ref={panelRef}
      role="alert"
      aria-live="polite"
      onKeyDown={(event) => {
        if (event.key === "Escape" && onCancel) {
          event.stopPropagation();
          onCancel();
        }
      }}
      className={cardClassName("flex animate-scale-in flex-col gap-4")}
    >
      <div className="text-base text-foreground">{message}</div>
      <div className="flex gap-3">
        <div className="flex-1">{cancelButton}</div>
        <div className="flex-1">{confirmButton}</div>
      </div>
    </div>
  );
}
