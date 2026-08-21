export default function TodayLoading() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-8">
      <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
      <div className="mt-8 h-3 w-28 animate-pulse rounded-full bg-muted" />
      <div className="mt-8 h-24 w-4/5 animate-pulse rounded-md bg-muted" />
      <div className="mt-8 h-3 w-16 animate-pulse rounded-full bg-muted" />
      <div className="mt-8 h-12 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
