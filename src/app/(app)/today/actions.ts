"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { createWorkoutSession } from "@/lib/domain";

export type StartWorkoutState = { error?: string } | undefined;

/**
 * `planItemId` arrives as a hidden form field, not trusted on its own --
 * createWorkoutSession() re-verifies it belongs to the caller's own plan
 * before creating anything.
 */
export async function startWorkoutAction(
  _prevState: StartWorkoutState,
  formData: FormData,
): Promise<StartWorkoutState> {
  const user = await requireUser();
  const planItemId = String(formData.get("planItemId") ?? "");

  if (!planItemId) {
    return { error: "Falta el entrenamiento planificado." };
  }

  let sessionId: string;
  try {
    ({ sessionId } = await createWorkoutSession(user.id, planItemId));
  } catch (err) {
    console.error("startWorkoutAction failed:", err);
    return { error: "No se ha podido empezar el entrenamiento. Inténtalo de nuevo." };
  }

  redirect(`/workout/${sessionId}`);
}
