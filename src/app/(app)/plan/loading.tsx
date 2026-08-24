export default function PlanLoading() {
  return (
    <div className="flex flex-1 flex-col pt-8">
      <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 border-b border-border py-5">
            <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
