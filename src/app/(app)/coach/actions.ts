"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { addRoutineToPlan, createPlan, createRoutine, getActivePlan } from "@/lib/domain";
import { draftsMatch, resolveAndValidateAction, toRawAction, type CoachActionDraft } from "@/lib/ai/action-draft";
import { executeCoachActionOps } from "@/lib/ai/action-execution";
import { resolveExistingRoutineByName, validatePlanDraft, type PlanDraft, type PlanDraftRoutineRef } from "@/lib/ai/plan-draft";
import { resolveExerciseByName, validateRoutineDraft, type RoutineDraft, type RoutineDraftExercise } from "@/lib/ai/routine-draft";

/**
 * The confirm -> execute half of the Coach IA write flow (brief §7/§18):
 * the LLM only ever produces a proposal (routine-draft.ts / action-draft.ts);
 * these two Server Actions are the ONLY functions that turn a confirmed
 * proposal into a real write, and only when invoked by a real UI form
 * submit (RoutineDraftPreview's "Crear" button / ActionPreview's
 * "Confirmar" button) -- nothing in coach-chat.tsx's `send()` path calls
 * either of these, and the LLM has no tool that does either. A typed "sí"
 * can never reach this file.
 */

export type CoachWriteState = { error?: string; executed?: true; message?: string } | undefined;

function revalidateCoachWriteScreens(routineIds: readonly string[], planIds: readonly string[] = []) {
  revalidatePath("/today");
  revalidatePath("/plan");
  revalidatePath("/coach");
  for (const routineId of new Set(routineIds)) {
    revalidatePath("/plan/edit");
    revalidatePath(`/plan/edit/routines/${routineId}`);
  }
  for (const planId of new Set(planIds)) {
    revalidatePath(`/plan/${planId}`);
    revalidatePath(`/plan/${planId}/edit`);
  }
}

/**
 * Confirms a `RoutineDraft` from `RoutineDraftPreview`. Re-resolves every
 * exercise name fresh against the real catalog (never trusts the
 * client-submitted `exerciseId` as authority -- an exercise could have
 * been deactivated since the draft was shown) and re-validates before
 * writing anything, via the exact same `validateRoutineDraft` the propose
 * step already used.
 */
export async function confirmCreateRoutineAction(_prevState: CoachWriteState, formData: FormData): Promise<CoachWriteState> {
  const user = await requireUser();

  const raw = formData.get("routineDraftJson");
  if (typeof raw !== "string") {
    return { error: "Falta la información de la rutina." };
  }

  let submitted: RoutineDraft;
  try {
    submitted = JSON.parse(raw) as RoutineDraft;
  } catch {
    return { error: "No se ha podido leer la rutina propuesta." };
  }

  const resolvedExercises: RoutineDraft["exercises"] = [];
  for (const exercise of submitted.exercises) {
    const match = await resolveExerciseByName(exercise.exerciseName);
    if (!match) {
      return { error: `"${exercise.exerciseName}" ya no está disponible en el catálogo. Pídele a SCOPE que proponga la rutina de nuevo.` };
    }
    resolvedExercises.push({ ...exercise, exerciseId: match.exerciseId, exerciseName: match.name });
  }

  const freshDraft: RoutineDraft = { ...submitted, exercises: resolvedExercises };
  const validation = validateRoutineDraft(freshDraft);
  if (!validation.valid) {
    return { error: validation.errors.join(" ") };
  }

  let routineId: string;
  try {
    const result = await createRoutine(user.id, {
      name: freshDraft.name,
      description: freshDraft.description,
      exercises: freshDraft.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        order: exercise.order,
        targetType: exercise.targetType,
        targetSets: exercise.sets,
        targetRepsMin: exercise.targetRepsMin,
        targetRepsMax: exercise.targetRepsMax,
        targetDurationSeconds: exercise.targetDurationSeconds,
        targetWeightKg: exercise.targetWeightKg,
      })),
    });
    routineId = result.routineId;
  } catch (err) {
    console.error("confirmCreateRoutineAction: createRoutine failed:", err);
    return { error: "No se ha podido crear la rutina. Inténtalo de nuevo." };
  }

  // Attaching to the active plan is a secondary step -- if the plan
  // vanished since the draft was shown (archived meanwhile) or the attach
  // itself fails, the routine the user actually asked for still exists;
  // don't fail the whole confirmation over it, just report honestly.
  let attachedToPlanName: string | null = null;
  if (submitted.addToActivePlan) {
    const activePlan = await getActivePlan(user.id);
    if (activePlan) {
      try {
        await addRoutineToPlan(user.id, activePlan.id, routineId);
        attachedToPlanName = activePlan.name;
      } catch (err) {
        console.error("confirmCreateRoutineAction: addRoutineToPlan failed:", err);
      }
    }
  }

  revalidateCoachWriteScreens([routineId]);

  const message = attachedToPlanName
    ? `Rutina creada: ${freshDraft.name} (${freshDraft.exercises.length} ejercicios). Añadida a ${attachedToPlanName}.`
    : `Rutina creada: ${freshDraft.name} (${freshDraft.exercises.length} ejercicios).`;
  return { executed: true, message };
}

/**
 * Confirms a `CoachActionDraft` from `ActionPreview`. Re-resolves and
 * re-validates the WHOLE batch fresh (`resolveAndValidateAction` -- the
 * exact same function `propose_action` used at proposal time) and compares
 * the fresh resolution against what was shown in the preview
 * (`draftsMatch`) before executing anything. Executes the fresh
 * resolution, never the client-submitted one -- minimizes the staleness
 * window as much as possible.
 */
export async function confirmCoachActionAction(_prevState: CoachWriteState, formData: FormData): Promise<CoachWriteState> {
  const user = await requireUser();

  const raw = formData.get("actionDraftJson");
  if (typeof raw !== "string") {
    return { error: "Falta la información del cambio." };
  }

  let submitted: CoachActionDraft;
  try {
    submitted = JSON.parse(raw) as CoachActionDraft;
  } catch {
    return { error: "No se ha podido leer el cambio propuesto." };
  }

  const fresh = await resolveAndValidateAction(user.id, toRawAction(submitted));

  if (fresh.status === "ambiguous") {
    return { error: "Esto se ha vuelto ambiguo desde que te lo propuse -- pídeselo de nuevo a SCOPE." };
  }
  if (fresh.status === "rejected") {
    return { error: fresh.reason };
  }
  if (!draftsMatch(fresh.draft, submitted)) {
    return { error: "Esto ha cambiado desde que te lo propuse. Pídeselo de nuevo a SCOPE para ver el estado actual." };
  }

  const result = await executeCoachActionOps(user.id, fresh.draft.ops);
  if (result.status === "failed") {
    return { error: result.reason };
  }

  const routineIds = fresh.draft.ops.flatMap((op) => ("routineId" in op ? [op.routineId] : []));
  const planIds = fresh.draft.ops.flatMap((op) => ("planId" in op ? [op.planId] : []));
  revalidateCoachWriteScreens(routineIds, planIds);
  return { executed: true, message: fresh.draft.summary };
}

/**
 * Confirms a `PlanDraft` from `PlanDraftPreview`. Mirrors
 * `confirmCreateRoutineAction`'s exact staleness shape (re-resolve fresh,
 * re-validate, only then write) rather than the ops/`draftsMatch` shape
 * `confirmCoachActionAction` uses -- a `PlanDraft` is a create-flow, like
 * `RoutineDraft`, not a batch of ops on something that already exists.
 *
 * Any brand-new routines the draft describes are created first (reusing
 * `createRoutine`, the same write `confirmCreateRoutineAction` itself
 * uses), then the plan is created referencing every routine's real id --
 * existing ones re-resolved fresh, new ones from what was just created.
 *
 * Known, accepted gap (documented, not silent): if a later routine in the
 * same draft fails to create after an earlier one already succeeded, that
 * earlier routine is NOT rolled back -- there is no `deleteRoutine`
 * function anywhere in this codebase to compensate with (routines may have
 * real session history; a delete primitive doesn't exist for anything
 * other than the archive-based `archivePlan` at the plan level). The
 * already-created routine is left in the user's library, unattached to any
 * plan -- harmless (a real, valid, if orphaned routine), never corrupted
 * data, and consistent with this codebase's existing "best-effort
 * compensation, not a real transaction" stance (see action-execution.ts's
 * own header comment).
 */
export async function confirmCreatePlanAction(_prevState: CoachWriteState, formData: FormData): Promise<CoachWriteState> {
  const user = await requireUser();

  const raw = formData.get("planDraftJson");
  if (typeof raw !== "string") {
    return { error: "Falta la información del plan." };
  }

  let submitted: PlanDraft;
  try {
    submitted = JSON.parse(raw) as PlanDraft;
  } catch {
    return { error: "No se ha podido leer el plan propuesto." };
  }

  const resolvedRoutines: PlanDraftRoutineRef[] = [];
  for (const ref of submitted.routines) {
    if (ref.kind === "existing") {
      const match = await resolveExistingRoutineByName(user.id, ref.routineName);
      if (!match) {
        return { error: `"${ref.routineName}" ya no está disponible. Pídele a SCOPE que proponga el plan de nuevo.` };
      }
      resolvedRoutines.push({ kind: "existing", routineId: match.routineId, routineName: match.name });
      continue;
    }

    const resolvedExercises: RoutineDraftExercise[] = [];
    for (const exercise of ref.exercises) {
      const match = await resolveExerciseByName(exercise.exerciseName);
      if (!match) {
        return { error: `"${exercise.exerciseName}" ya no está disponible en el catálogo. Pídele a SCOPE que proponga el plan de nuevo.` };
      }
      resolvedExercises.push({ ...exercise, exerciseId: match.exerciseId, exerciseName: match.name });
    }
    resolvedRoutines.push({ kind: "new", name: ref.name, exercises: resolvedExercises });
  }

  const freshDraft: PlanDraft = { ...submitted, routines: resolvedRoutines };
  const validation = validatePlanDraft(freshDraft);
  if (!validation.valid) {
    return { error: validation.errors.join(" ") };
  }

  const routineIds: string[] = [];
  const newlyCreatedRoutineIds: string[] = [];
  for (const ref of freshDraft.routines) {
    if (ref.kind === "existing") {
      routineIds.push(ref.routineId);
      continue;
    }
    try {
      const created = await createRoutine(user.id, {
        name: ref.name,
        description: null,
        exercises: ref.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          targetType: exercise.targetType,
          targetSets: exercise.sets,
          targetRepsMin: exercise.targetRepsMin,
          targetRepsMax: exercise.targetRepsMax,
          targetDurationSeconds: exercise.targetDurationSeconds,
          targetWeightKg: exercise.targetWeightKg,
        })),
      });
      routineIds.push(created.routineId);
      newlyCreatedRoutineIds.push(created.routineId);
    } catch (err) {
      console.error("confirmCreatePlanAction: createRoutine failed:", err);
      return { error: "No se ha podido crear una de las rutinas nuevas. Inténtalo de nuevo." };
    }
  }

  let planId: string;
  let activated: boolean;
  try {
    const result = await createPlan(
      user.id,
      { name: freshDraft.name, routineIds },
      { activateOnCreate: freshDraft.activateOnCreate },
    );
    planId = result.planId;
    activated = result.activated;
  } catch (err) {
    console.error("confirmCreatePlanAction: createPlan failed:", err);
    return { error: "No se ha podido crear el plan. Inténtalo de nuevo." };
  }

  revalidateCoachWriteScreens(newlyCreatedRoutineIds, [planId]);

  const message = activated
    ? `Plan creado: ${freshDraft.name} (${routineIds.length} rutinas). Activado.`
    : `Plan creado: ${freshDraft.name} (${routineIds.length} rutinas).`;
  return { executed: true, message };
}
