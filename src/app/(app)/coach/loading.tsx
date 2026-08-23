export default function CoachLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pt-8">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
        <div className="size-11 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-16 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
