/** The filled lime "success" checkmark — one shared shape for every completion moment (exercise done, session completed), not re-authored per screen. */
export function CheckBadge() {
  return (
    <span
      aria-hidden="true"
      className="flex size-14 animate-check-pop items-center justify-center rounded-full bg-success text-2xl font-bold text-success-foreground"
    >
      ✓
    </span>
  );
}
