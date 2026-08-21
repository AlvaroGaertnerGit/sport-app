/** Same skeleton convention as today/loading.tsx -- getWorkoutSession does two Supabase reads before this page can render anything. */
export default function WorkoutSessionLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-5 pt-6 pb-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-12 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-0.5 w-full animate-pulse bg-muted" />
      </div>
      <div className="mt-8 h-20 w-4/5 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 h-40 w-full animate-pulse rounded-md bg-muted" />
      <div className="mt-8 h-12 w-full animate-pulse rounded-md bg-muted" />
    </main>
  );
}
