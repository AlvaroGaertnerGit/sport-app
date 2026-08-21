/** Same skeleton convention as today/loading.tsx -- getWorkoutSession does two Supabase reads before this page can render anything. */
export default function WorkoutSessionLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
