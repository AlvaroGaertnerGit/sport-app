export default function CalendarLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-10">
      <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="mx-auto h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
