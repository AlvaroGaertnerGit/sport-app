"use client";

import { useId, useState } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";

type SetValueStepperProps = {
  label: string;
  defaultValue: number;
  step?: number;
  /** Which digits are allowed and how the displayed value is rounded -- 0 (default) is whole numbers only (reps/seconds); pass e.g. 1 for a weight stepper (kg to one decimal). */
  decimals?: number;
  /** Form field name -- defaults to "value" (reps/duration); a weight stepper alongside it posts as "weightKg" so both reach the server in one submit. */
  name?: string;
  /** Renders inline in the active set row (design reference: "03  [-] 12 [+]") — the label stays for screen readers via aria-label, just not shown visually. */
  compact?: boolean;
};

/**
 * Reps/seconds/weight input for one set: `[-] value [+]`, each control a
 * real 44px touch target. `type="text"` + `inputMode` (not `type="number"`)
 * so there's no native spinner fighting the custom one, and `font-size`
 * stays at 16px+ so iOS Safari doesn't zoom in on focus.
 *
 * Uncontrolled-from-the-parent: the target value only changes when the
 * user picks a different exercise, so the parent passes
 * `key={exercise.exerciseId}` to remount (and thus reset) this instead of
 * syncing `defaultValue` via an effect.
 */
export function SetValueStepper({
  label,
  defaultValue,
  step = 1,
  decimals = 0,
  name = "value",
  compact = false,
}: SetValueStepperProps) {
  const [value, setValue] = useState(defaultValue);
  // Bumped only by the +/- buttons (never by typing) -- remounting just
  // this row restarts the CSS animation below so each tap reads as a
  // distinct event, per the brief's "el número puede tener un pequeño
  // scale" ask, without interrupting a user who's mid-typing a value.
  const [pulse, setPulse] = useState(0);
  const inputId = useId();

  /**
   * At `decimals === 0` this is `Math.round(next)`, bit-for-bit the
   * original reps/duration behavior. Once `step` isn't a whole number
   * (a weight stepper, e.g. `step=2.5`), rounding to the nearest *integer*
   * would be wrong -- 7.5 would collapse to 8 -- so this rounds to the
   * nearest valid multiple of `step` instead, then fixes the display to
   * `decimals` places to avoid floating-point noise (2.5*3 etc.).
   */
  function clamp(next: number): number {
    const snapped = Math.round(next / step) * step;
    const bounded = Math.max(0, snapped);
    return Number(bounded.toFixed(decimals));
  }

  function step_(delta: number) {
    setValue((v) => clamp(v + delta));
    setPulse((p) => p + 1);
  }

  const buttonClassName = `flex size-11 shrink-0 items-center justify-center rounded-md border border-border font-mono text-lg text-foreground transition duration-150 hover:border-primary hover:text-primary active:scale-90 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;
  const allowedCharsPattern = decimals > 0 ? /[^0-9.]/g : /[^0-9]/g;

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
          onClick={() => step_(-step)}
          className={buttonClassName}
        >
          −
        </button>
        <input
          key={pulse}
          id={inputId}
          name={name}
          type="text"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          pattern={decimals > 0 ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
          aria-label={compact ? label : undefined}
          defaultValue={decimals > 0 ? value.toFixed(decimals) : value}
          onChange={(event) => {
            const raw = event.target.value.replace(allowedCharsPattern, "");
            setValue(raw === "" || raw === "." ? 0 : clamp(Number(raw)));
          }}
          required
          className={`min-h-11 animate-pulse-once rounded-md border border-border bg-transparent text-center font-mono text-xl font-bold text-foreground tabular-nums ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary ${compact ? (decimals > 0 ? "w-20" : "w-16") : "w-full min-w-0 flex-1"}`}
        />
        <button
          type="button"
          aria-label={compact ? `Aumentar, ${label}` : "Aumentar"}
          onClick={() => step_(step)}
          className={buttonClassName}
        >
          +
        </button>
      </div>
    </div>
  );
}
