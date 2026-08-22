export default function ConfigureRoutineLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-5 pt-6 pb-10">
      <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-2/3 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
