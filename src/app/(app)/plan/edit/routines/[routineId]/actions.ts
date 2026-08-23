"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import {
  addExerciseToRoutine,
  getRoutineDetail,
  removeExerciseFromRoutine,
  reorderRoutineExercise,
  searchExercises,
  updateRoutineExerciseTarget,
} from "@/lib/domain";
import type { ExerciseSearchResult, NewRoutineExerciseTarget } from "@/lib/domain";

function revalidateRoutineScreens(routineId: string) {
  revalidatePath(`/plan/edit/routines/${routineId}`);
  revalidatePath("/plan/edit");
  revalidatePath("/plan");
  revalidatePath("/today");
}

/**
 * Called directly as a plain async function from the search step's
 * debounced input handler (same "Client Component calls a Server Action
 * directly" pattern `ArchivePlanButton`/`CreatePlanWizard` already use) --
 * not a route handler, so there is still no Client → Supabase call
 * anywhere; the actual query runs inside this server-executed function.
 *
 * The exclude list is re-derived fresh on every call (via `getRoutineDetail`,
 * already built) rather than trusted from the client, so a stale client
 * list can never let a duplicate slip through.
 */
export async function searchExercisesForRoutineAction(routineId: string, query: string): Promise<ExerciseSearchResult[]> {
  const user = await requireUser();
  const routine = await getRoutineDetail(user.id, routineId);
  const excludeIds = routine ? routine.exercises.map((exercise) => exercise.exerciseId) : [];
  return searchExercises(query, excludeIds);
}

export type ExerciseActionState = { error?: string } | undefined;

function parseRequiredInt(formData: FormData, field: string): number | null {
  const raw = formData.get(field);
  const value = Number(raw);
  return raw != null && raw !== "" && Number.isFinite(value) && Number.isInteger(value) ? value : null;
}

function parseOptionalWeight(formData: FormData): { ok: true; value: number | null } | { ok: false } {
  const raw = formData.get("targetWeightKg");
  if (raw == null || raw === "") {
    return { ok: true, value: null };
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? { ok: true, value } : { ok: false };
}

/**
 * `target` is never defaulted -- every field is parsed from the form the
 * "configure"/"editar" step submits, since `routine_exercises` has real
 * check constraints (target_type coherence, sets > 0, ...) a silent
 * default could violate or, worse, misrepresent (e.g. a duration exercise
 * defaulted to a rep range). Shared by add-exercise's ConfigureStep and
 * the new per-row edit form -- same fields, same rules, one parser.
 */
function parseTargetFromForm(formData: FormData): { ok: true; target: NewRoutineExerciseTarget } | { ok: false; error: string } {
  const targetType = formData.get("targetType") === "duration" ? "duration" : "reps";

  const targetSets = parseRequiredInt(formData, "targetSets");
  if (targetSets == null || targetSets < 1) {
    return { ok: false, error: "Número de series no válido." };
  }

  const weight = parseOptionalWeight(formData);
  if (!weight.ok) {
    return { ok: false, error: "Peso no válido." };
  }

  if (targetType === "duration") {
    const targetDurationSeconds = parseRequiredInt(formData, "targetDurationSeconds");
    if (targetDurationSeconds == null || targetDurationSeconds < 1) {
      return { ok: false, error: "Duración no válida." };
    }
    return {
      ok: true,
      target: {
        targetType: "duration",
        targetSets,
        targetRepsMin: null,
        targetRepsMax: null,
        targetDurationSeconds,
        targetWeightKg: weight.value,
      },
    };
  }

  const targetRepsMin = parseRequiredInt(formData, "targetRepsMin");
  if (targetRepsMin == null || targetRepsMin < 0) {
    return { ok: false, error: "Repeticiones mínimas no válidas." };
  }
  const rawMax = formData.get("targetRepsMax");
  const targetRepsMax = rawMax != null && rawMax !== "" ? parseRequiredInt(formData, "targetRepsMax") : targetRepsMin;
  if (targetRepsMax == null || targetRepsMax < targetRepsMin) {
    return { ok: false, error: "Repeticiones máximas no válidas." };
  }
  return {
    ok: true,
    target: {
      targetType: "reps",
      targetSets,
      targetRepsMin,
      targetRepsMax,
      targetDurationSeconds: null,
      targetWeightKg: weight.value,
    },
  };
}

export async function addExerciseToRoutineAction(
  _prevState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const routineId = String(formData.get("routineId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!routineId || !exerciseId) {
    return { error: "Falta información del ejercicio." };
  }

  const parsed = parseTargetFromForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  try {
    await addExerciseToRoutine(user.id, routineId, exerciseId, parsed.target);
  } catch (err) {
    console.error("addExerciseToRoutineAction failed:", err);
    return { error: "No se ha podido añadir el ejercicio. Puede que ya esté en la rutina." };
  }

  revalidateRoutineScreens(routineId);
}

/**
 * The manual editor's counterpart to the Coach IA's `update_exercise_target`
 * write path (action-execution.ts) -- both end up calling the same,
 * unchanged `updateRoutineExerciseTarget` domain function with a full
 * target, never a parallel write path.
 */
export async function updateExerciseTargetAction(
  _prevState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const routineId = String(formData.get("routineId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!routineId || !exerciseId) {
    return { error: "Falta información del ejercicio." };
  }

  const parsed = parseTargetFromForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  try {
    await updateRoutineExerciseTarget(user.id, routineId, exerciseId, parsed.target);
  } catch (err) {
    console.error("updateExerciseTargetAction failed:", err);
    return { error: "No se ha podido guardar el cambio." };
  }

  revalidateRoutineScreens(routineId);
}

/**
 * ↑/↓ per row -- the accessible alternative to drag & drop (never the only
 * way to reorder). `toPosition` is the exercise's own current `order` ± 1;
 * `reorderRoutineExercise` already clamps out-of-range positions, so moving
 * the first exercise up or the last one down is a harmless no-op, not an
 * error.
 */
export async function reorderRoutineExerciseAction(
  _prevState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const routineId = String(formData.get("routineId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const toPosition = Number(formData.get("toPosition"));

  if (!routineId || !exerciseId || !Number.isInteger(toPosition)) {
    return { error: "Falta información del ejercicio." };
  }

  try {
    await reorderRoutineExercise(user.id, routineId, exerciseId, toPosition);
  } catch (err) {
    console.error("reorderRoutineExerciseAction failed:", err);
    return { error: "No se ha podido mover el ejercicio." };
  }

  revalidateRoutineScreens(routineId);
}

export async function removeExerciseFromRoutineAction(
  _prevState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireUser();
  const routineId = String(formData.get("routineId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");
  if (!routineId || !exerciseId) {
    return { error: "Falta información del ejercicio." };
  }

  try {
    await removeExerciseFromRoutine(user.id, routineId, exerciseId);
  } catch (err) {
    console.error("removeExerciseFromRoutineAction failed:", err);
    return { error: "No se ha podido quitar el ejercicio." };
  }

  revalidateRoutineScreens(routineId);
}
