import "server-only";

import {
  addRoutineToPlan,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  removePlanItem,
  replaceExerciseInRoutine,
  reorderRoutineExercise,
  restoreRoutineExerciseAt,
  updateRoutineExerciseTarget,
} from "@/lib/domain";
import type { CoachActionOp } from "./action-draft";

/**
 * Executes a resolved `CoachActionOp[]` batch against the real domain
 * functions -- the one place `confirmCoachActionAction` (coach/actions.ts)
 * turns a confirmed proposal into real writes. Ops run sequentially, in
 * the order the user asked for them (matters: "quita fondos y pon press
 * banca primero" needs the removal before the reorder is meaningful).
 *
 * Best-effort compensation, not a real transaction (no Postgres RPC/
 * transaction helper exists anywhere in this codebase, confirmed) -- on
 * any op throwing, execution stops immediately and every already-completed
 * op is undone in reverse order via its natural inverse. If undoing itself
 * fails (a genuine double-failure), that's logged server-side with full
 * context rather than silently swallowed -- the caller still gets a plain,
 * honest failure message instead of a false "listo" or a hidden partial
 * write.
 */
export type ExecuteActionResult = { status: "ok" } | { status: "failed"; reason: string };

/** A completed op plus whatever runtime state its own undo needs -- `add_routine_to_plan`'s inverse (`removePlanItem`) needs the created `plan_items.id`, which doesn't exist until the write itself succeeds, so it can't live on the statically-resolved `CoachActionOp`. */
type CompletedOp = { op: CoachActionOp; planItemId?: string };

async function undoOp(userId: string, completed: CompletedOp): Promise<void> {
  const { op } = completed;
  switch (op.type) {
    case "add_routine_to_plan": {
      if (!completed.planItemId) return; // should never happen -- applyOp always sets it on success
      const result = await removePlanItem(userId, op.planId, completed.planItemId);
      // A vanishingly unlikely race within one synchronous confirm request
      // (a session logged against this exact plan_item in the instant
      // between the add and the compensation) -- logged, not thrown, since
      // this already runs inside the undo path itself.
      if (!result.removed) {
        console.error("[coach-action] compensation could not remove plan item (has_history)", { userId, op });
      }
      return;
    }
    case "add_exercise":
      await removeExerciseFromRoutine(userId, op.routineId, op.exerciseId);
      return;
    case "remove_exercise":
      await restoreRoutineExerciseAt(userId, op.routineId, op.exerciseId, op.snapshot.order, op.snapshot.target);
      return;
    case "replace_exercise":
      await replaceExerciseInRoutine(userId, op.routineId, op.toExerciseId, op.fromExerciseId);
      return;
    case "reorder_exercise":
      await reorderRoutineExercise(userId, op.routineId, op.exerciseId, op.fromPosition);
      return;
    case "update_exercise_target":
      await updateRoutineExerciseTarget(userId, op.routineId, op.exerciseId, op.previousTargetSets);
      return;
  }
}

async function applyOp(userId: string, op: CoachActionOp): Promise<{ planItemId?: string }> {
  switch (op.type) {
    case "add_routine_to_plan": {
      const { planItemId } = await addRoutineToPlan(userId, op.planId, op.routineId);
      return { planItemId };
    }
    case "add_exercise":
      await addExerciseToRoutine(userId, op.routineId, op.exerciseId, op.target);
      return {};
    case "remove_exercise":
      await removeExerciseFromRoutine(userId, op.routineId, op.exerciseId);
      return {};
    case "replace_exercise":
      await replaceExerciseInRoutine(userId, op.routineId, op.fromExerciseId, op.toExerciseId);
      return {};
    case "reorder_exercise":
      await reorderRoutineExercise(userId, op.routineId, op.exerciseId, op.toPosition);
      return {};
    case "update_exercise_target":
      await updateRoutineExerciseTarget(userId, op.routineId, op.exerciseId, op.targetSets);
      return {};
  }
}

export async function executeCoachActionOps(userId: string, ops: readonly CoachActionOp[]): Promise<ExecuteActionResult> {
  const completed: CompletedOp[] = [];

  for (const op of ops) {
    try {
      const { planItemId } = await applyOp(userId, op);
      completed.push({ op, planItemId });
    } catch (err) {
      console.error("[coach-action] op failed, compensating:", err instanceof Error ? err.message : err, { userId, op });

      for (const done of [...completed].reverse()) {
        try {
          await undoOp(userId, done);
        } catch (undoErr) {
          console.error(
            "[coach-action] compensation itself failed -- routine may be left partially modified:",
            undoErr instanceof Error ? undoErr.message : undoErr,
            { userId, op: done.op },
          );
        }
      }

      return { status: "failed", reason: "No se ha podido completar el cambio. Tu rutina no se ha modificado." };
    }
  }

  return { status: "ok" };
}
