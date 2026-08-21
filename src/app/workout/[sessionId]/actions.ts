"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { abandonWorkoutSession, completeWorkoutSession, logSet } from "@/lib/domain";

export type WorkoutActionState = { error?: string } | undefined;

// Carries which exercise the error belongs to -- the panel is shared across
// exercises via one useActionState at the session-view level, so without
// this an error from exercise A would still render after navigating to
// exercise B, which never actually failed anything.
export type LogSetActionState = { error?: string; exerciseId?: string } | undefined;

const GENERIC_ERROR = "No se ha podido guardar. Inténtalo de nuevo.";

/**
 * Runs one domain mutation and turns a thrown error into a logged message +
 * the generic user-facing string -- the try/catch/console.error shape every
 * action below needs, written once instead of three times.
 */
async function runMutation(label: string, mutation: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await mutation();
  } catch (err) {
    console.error(`${label} failed:`, err);
    return GENERIC_ERROR;
  }
  return undefined;
}

/**
 * `sessionId`/`exerciseId` arrive as hidden form fields, not query/path
 * trust — logSet() itself re-verifies session ownership+status and that
 * the exercise belongs to the session's routine, so a tampered request
 * can't log a set against someone else's session or an unrelated exercise.
 */
export async function logSetAction(
  _prevState: LogSetActionState,
  formData: FormData,
): Promise<LogSetActionState> {
  const user = await requireUser();

  const sessionId = String(formData.get("sessionId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const value = Number(formData.get("value"));

  if (!sessionId || !exerciseId || !Number.isFinite(value) || value < 0) {
    return { error: "Valor no válido.", exerciseId };
  }

  const error = await runMutation("logSetAction", () => logSet(user.id, sessionId, exerciseId, value));

  revalidatePath(`/workout/${sessionId}`);

  // exerciseId comes back on both paths -- session-view.tsx's rest-auto-start
  // effect keys off it to confirm this settled state actually belongs to the
  // exercise it's about to start a rest timer for.
  return error ? { error, exerciseId } : { exerciseId };
}

export async function completeSessionAction(
  _prevState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) {
    return { error: "Falta la sesión." };
  }

  const error = await runMutation("completeSessionAction", () => completeWorkoutSession(user.id, sessionId));
  if (error) {
    return { error };
  }

  // Today's rotation depends on this session now being `completed` --
  // revalidate before redirecting so /today computes the next plan_item
  // instead of serving a cached "in_progress" recommendation.
  revalidatePath("/today");
  redirect("/today");
}

export async function abandonSessionAction(
  _prevState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) {
    return { error: "Falta la sesión." };
  }

  const error = await runMutation("abandonSessionAction", () => abandonWorkoutSession(user.id, sessionId));
  if (error) {
    return { error };
  }

  revalidatePath("/today");
  redirect("/today");
}
