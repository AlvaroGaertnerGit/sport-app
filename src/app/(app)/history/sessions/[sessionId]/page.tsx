import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { getWorkoutSession } from "@/lib/domain";

import { SessionDetail } from "../../session-detail";

/**
 * Read-only. Reuses `getWorkoutSession` as-is (it already returns routine,
 * exercises, targets and set logs for any status, not just in_progress)
 * and the shared `SessionDetail` presentational component -- also reused
 * inline by Calendar's day detail, so there is exactly one implementation
 * of "how a finished session renders."
 */
export default async function SessionDetailPage(props: PageProps<"/history/sessions/[sessionId]">) {
  const user = await requireUser();
  const { sessionId } = await props.params;
  const session = await getWorkoutSession(user.id, sessionId);

  if (!session || session.status === "in_progress") {
    // in_progress isn't "history" yet -- it belongs to Today/Workout.
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-10">
      <Link
        href="/history/sessions"
        className="inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        ← Volver
      </Link>

      <SessionDetail session={session} />
    </div>
  );
}
