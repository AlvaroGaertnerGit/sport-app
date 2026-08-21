import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { getWorkoutSession } from "@/lib/domain";

import { WorkoutSessionView } from "./session-view";

/**
 * Deliberately outside the (app) route group: no bottom nav here. A
 * workout in progress should be a focused, full-screen task, not another
 * screen competing with the app shell's chrome.
 */
export default async function WorkoutSessionPage(props: PageProps<"/workout/[sessionId]">) {
  const { sessionId } = await props.params;
  const user = await requireUser();

  // null covers "doesn't exist" and "isn't yours" alike (RLS would block
  // the read either way) -- never distinguish the two to the client.
  const session = await getWorkoutSession(user.id, sessionId);

  if (!session) {
    notFound();
  }

  if (session.status !== "in_progress") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {session.status === "completed" ? "Entrenamiento completado" : "Entrenamiento abandonado"}
        </h1>
        <p className="text-sm text-muted-foreground">Esta sesión ya ha terminado.</p>
        <Link
          href="/today"
          className="text-sm font-medium text-primary underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Volver a Hoy
        </Link>
      </div>
    );
  }

  return <WorkoutSessionView session={session} />;
}
