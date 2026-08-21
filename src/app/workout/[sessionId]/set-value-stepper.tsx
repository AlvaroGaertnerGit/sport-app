"use client";

import { useId, useState } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";

type SetValueStepperProps = {
  label: string;
  defaultValue: number;
  step?: number;
  /** Renders inline in the active set row (design reference: "03  [-] 12 [+]") — the label stays for screen readers via aria-label, just not shown visually. */
  compact?: boolean;
};

/**
 * Reps/seconds input for one set: `[-] value [+]`, each control a real
 * 44px touch target. `type="text"` + `inputMode="numeric"` (not
 * `type="number"`) so there's no native spinner fighting the custom one,
 * and `font-size` stays at 16px+ so iOS Safari doesn't zoom in on focus.
 *
 * Uncontrolled-from-the-parent: the target value only changes when the
 * user picks a different exercise, so the parent passes
 * `key={exercise.exerciseId}` to remount (and thus reset) this instead of
 * syncing `defaultValue` via an effect.
 */
export function SetValueStepper({ label, defaultValue, step = 1, compact = false }: SetValueStepperProps) {
  const [value, setValue] = useState(defaultValue);
  const inputId = useId();

  function clamp(next: number) {
    return Math.max(0, Math.round(next));
  }

  const buttonClassName = `flex size-11 shrink-0 items-center justify-center rounded-md border border-border font-mono text-lg text-foreground transition-colors hover:border-primary hover:text-primary ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

  return (
    <div className={compact ? "flex flex-col items-end gap-1.5" : "flex flex-col gap-2"}>
      {!compact && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={compact ? `Disminuir, ${label}` : "Disminuir"}
          onClick={() => setValue((v) => clamp(v - step))}
          className={buttonClassName}
        >
          −
        </button>
        <input
          id={inputId}
          name="value"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={compact ? label : undefined}
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            setValue(digits === "" ? 0 : clamp(Number(digits)));
          }}
          required
          className={`min-h-11 rounded-md border border-border bg-transparent text-center font-mono text-xl font-bold text-foreground tabular-nums ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary ${compact ? "w-16" : "w-full min-w-0 flex-1"}`}
        />
        <button
          type="button"
          aria-label={compact ? `Aumentar, ${label}` : "Aumentar"}
          onClick={() => setValue((v) => clamp(v + step))}
          className={buttonClassName}
        >
          +
        </button>
      </div>
    </div>
  );
}
