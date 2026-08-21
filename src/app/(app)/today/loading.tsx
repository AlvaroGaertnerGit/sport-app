export default function TodayLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 pt-10">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-7 w-48 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}
