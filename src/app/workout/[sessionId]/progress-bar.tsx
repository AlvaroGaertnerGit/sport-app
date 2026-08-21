type SegmentState = "done" | "current" | "pending";

/**
 * A completed exercise is a "success" state (lime), not "action/intensity"
 * (red) -- the current position is neutral, just "you are here". Done also
 * renders visibly thicker than pending/current -- height, not just color,
 * carries "done" (CLAUDE.md §11: el color nunca es la única señal).
 */
const SEGMENT_CLASSNAME: Record<SegmentState, string> = {
  done: "h-1 bg-success",
  current: "h-0.5 bg-foreground",
  pending: "h-0.5 bg-border",
};

/**
 * Discrete visual companion to the "2 / 5" text next to it — a thin line,
 * not a chunky rounded bar (see docs/style-reference). Decorative (the
 * text already carries the count accessibly), so this stays out of the
 * a11y tree.
 */
export function ProgressBar({ segments }: { segments: readonly SegmentState[] }) {
  return (
    <div aria-hidden="true" className="flex items-end gap-1">
      {segments.map((state, i) => (
        <span key={i} className={`flex-1 transition-all duration-200 ${SEGMENT_CLASSNAME[state]}`} />
      ))}
    </div>
  );
}
