export default function ProfileLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pt-8">
      <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
