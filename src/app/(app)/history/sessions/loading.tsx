export default function SessionsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-6">
      <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-col gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-border pb-5">
            <div className="h-3 w-14 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
