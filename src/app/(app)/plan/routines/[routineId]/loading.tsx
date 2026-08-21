export default function RoutineDetailLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-10">
      <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-12 w-3/4 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-40 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
