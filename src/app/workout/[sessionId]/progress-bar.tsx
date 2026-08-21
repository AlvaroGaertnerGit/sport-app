type SegmentState = "done" | "current" | "pending";

const SEGMENT_CLASSNAME: Record<SegmentState, string> = {
  done: "bg-primary",
  current: "bg-primary/40",
  pending: "bg-muted",
};

/**
 * Discrete visual companion to the "2 / 5" text next to it — not a
 * dashboard, just a glance-able strip. Decorative (the text already
 * carries the count accessibly), so this stays out of the a11y tree.
 */
export function ProgressBar({ segments }: { segments: readonly SegmentState[] }) {
  return (
    <div aria-hidden="true" className="flex gap-1">
      {segments.map((state, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${SEGMENT_CLASSNAME[state]}`} />
      ))}
    </div>
  );
}
