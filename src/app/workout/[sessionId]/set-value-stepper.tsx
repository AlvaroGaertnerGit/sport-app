"use client";

import { useId, useState } from "react";

type SetValueStepperProps = {
  label: string;
  defaultValue: number;
  step?: number;
};

/**
 * Reps/seconds input for one set: `[-] value [+]`, each control a real
 * 44px touch target. `type="text"` + `inputMode="numeric"` (not
 * `type="number"`) so there's no native spinner fighting the custom one,
 * and `font-size` stays at 16px+ (text-base) so iOS Safari doesn't
 * zoom in on focus.
 *
 * Uncontrolled-from-the-parent: the target value only changes when the
 * user picks a different exercise, so the parent passes
 * `key={exercise.exerciseId}` to remount (and thus reset) this instead of
 * syncing `defaultValue` via an effect.
 */
export function SetValueStepper({ label, defaultValue, step = 1 }: SetValueStepperProps) {
  const [value, setValue] = useState(defaultValue);
  const inputId = useId();

  function clamp(next: number) {
    return Math.max(0, Math.round(next));
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label="Disminuir"
          onClick={() => setValue((v) => clamp(v - step))}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          −
        </button>
        <input
          id={inputId}
          name="value"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            setValue(digits === "" ? 0 : clamp(Number(digits)));
          }}
          required
          className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-center text-base font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <button
          type="button"
          aria-label="Aumentar"
          onClick={() => setValue((v) => clamp(v + step))}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          +
        </button>
      </div>
    </div>
  );
}
