export default function ProgressLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-6">
      <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-16 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
      <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      <div className="mt-4 h-24 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
