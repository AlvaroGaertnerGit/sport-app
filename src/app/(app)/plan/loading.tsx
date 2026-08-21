export default function PlanLoading() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-8">
      <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
      <div className="mt-10 flex flex-col gap-8">
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-24 w-4/5 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
