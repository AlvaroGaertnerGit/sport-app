import "server-only";

import { getActivePlan } from "@/lib/domain/plans";
import { getRoutineDetail, getUserRoutines } from "@/lib/domain/routines";
import { searchExercises } from "@/lib/domain/exercises";
import type { NewRoutineExerciseTarget, RoutineDetailExercise, RoutineSummary } from "@/lib/domain/types";

/**
 * The write-action counterpart of `RoutineDraft` (routine-draft.ts) --
 * covers the 6 edit-an-existing-routine/plan ops (brief §1/§4).
 * `create_routine` is deliberately NOT one of these: it reuses the
 * already-built `propose_routine_draft`/`RoutineDraftPreview` flow instead
 * (see coach/actions.ts's `confirmCreateRoutineAction`) rather than forcing
 * a second, redundant LLM tool call and a confusing double-preview UI.
 *
 * The LLM only ever produces a `RawCoachAction` (names, never IDs --
 * CLAUDE.md §7/brief §5: "el LLM no debe ser quien determine IDs internos
 * arbitrarios"). `resolveAndValidateAction` is the ONLY place a name
 * becomes a real database id, and it's called from both the propose-time
 * tool (tools.ts) and the confirm-time Server Action (coach/actions.ts) --
 * one validation layer, two call sites, per CLAUDE.md §7.
 */

export type CoachActionOpType =
  | "add_routine_to_plan"
  | "add_exercise"
  | "remove_exercise"
  | "replace_exercise"
  | "reorder_exercise"
  | "update_exercise_target";

export type RawCoachActionOp = {
  type: CoachActionOpType;
  routineName: string | null;
  exerciseName: string | null;
  newExerciseName: string | null;
  targetType: "reps" | "duration" | null;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
  targetWeightKg: number | null;
  restSeconds: number | null;
  toPosition: number | null;
};

export type RawCoachAction = { summary: string; ops: RawCoachActionOp[] };

export type CoachActionOp =
  | { type: "add_routine_to_plan"; planId: string; planName: string; routineId: string; routineName: string }
  | {
      type: "add_exercise";
      routineId: string;
      routineName: string;
      exerciseId: string;
      exerciseName: string;
      target: NewRoutineExerciseTarget;
    }
  | {
      type: "remove_exercise";
      routineId: string;
      routineName: string;
      exerciseId: string;
      exerciseName: string;
      snapshot: { order: number; target: NewRoutineExerciseTarget };
    }
  | {
      type: "replace_exercise";
      routineId: string;
      routineName: string;
      fromExerciseId: string;
      fromExerciseName: string;
      toExerciseId: string;
      toExerciseName: string;
    }
  | {
      type: "reorder_exercise";
      routineId: string;
      routineName: string;
      exerciseId: string;
      exerciseName: string;
      toPosition: number;
      fromPosition: number;
    }
  | {
      type: "update_exercise_target";
      routineId: string;
      routineName: string;
      exerciseId: string;
      exerciseName: string;
      targetSets: number;
      previousTargetSets: number;
      target: NewRoutineExerciseTarget;
      previousTarget: NewRoutineExerciseTarget;
    };

export type CoachActionDraft = { summary: string; ops: CoachActionOp[]; destructive: boolean };

export type CoachActionResolution =
  | { status: "resolved"; draft: CoachActionDraft }
  | { status: "rejected"; reason: string }
  /** The model must turn this into a plain-text clarifying question -- never a preview for something not yet resolved. */
  | { status: "ambiguous"; question: string };

/** Shared name-matching rule for every resolver below: exact (case-insensitive) match wins outright; otherwise a conservative substring relationship (mirrors `resolveExerciseByName`'s own fuzzy rule in routine-draft.ts, generalized to report ambiguity instead of silently picking the first hit). */
function pickByName<T>(
  items: readonly T[],
  name: string,
  getName: (item: T) => string,
): { status: "resolved"; item: T } | { status: "ambiguous"; candidates: string[] } | { status: "not_found" } {
  const query = name.trim().toLowerCase();
  const exact = items.find((item) => getName(item).trim().toLowerCase() === query);
  if (exact) {
    return { status: "resolved", item: exact };
  }

  const fuzzy = items.filter((item) => {
    const itemName = getName(item).trim().toLowerCase();
    return itemName.includes(query) || query.includes(itemName);
  });
  if (fuzzy.length === 1) {
    return { status: "resolved", item: fuzzy[0] };
  }
  if (fuzzy.length > 1) {
    return { status: "ambiguous", candidates: fuzzy.map(getName) };
  }
  return { status: "not_found" };
}

async function resolveRoutineForUser(
  userId: string,
  name: string,
): Promise<{ status: "resolved"; routine: RoutineSummary } | { status: "ambiguous" | "not_found" | "rejected"; reason: string }> {
  const routines = await getUserRoutines(userId);
  const picked = pickByName(routines, name, (r) => r.name);

  if (picked.status === "resolved") {
    return { status: "resolved", routine: picked.item };
  }
  if (picked.status === "ambiguous") {
    return {
      status: "ambiguous",
      reason: `Tienes varias rutinas parecidas a "${name}": ${picked.candidates.join(", ")}. ¿Cuál quieres decir?`,
    };
  }
  return { status: "not_found", reason: `No encuentro ninguna rutina llamada "${name}".` };
}

async function resolveExerciseInRoutine(
  userId: string,
  routineId: string,
  routineName: string,
  name: string,
): Promise<{ status: "resolved"; exercise: RoutineDetailExercise } | { status: "ambiguous" | "not_found" | "rejected"; reason: string }> {
  const detail = await getRoutineDetail(userId, routineId);
  if (!detail) {
    return { status: "rejected", reason: `La rutina "${routineName}" ya no existe.` };
  }

  const picked = pickByName(detail.exercises, name, (e) => e.exerciseName);
  if (picked.status === "resolved") {
    return { status: "resolved", exercise: picked.item };
  }
  if (picked.status === "ambiguous") {
    return {
      status: "ambiguous",
      reason: `En "${routineName}" hay varios ejercicios parecidos a "${name}": ${picked.candidates.join(", ")}. ¿Cuál quieres decir?`,
    };
  }
  return { status: "not_found", reason: `"${name}" no está en la rutina "${routineName}".` };
}

async function resolveExerciseFromCatalog(
  name: string,
  excludeExerciseIds: readonly string[] = [],
): Promise<{ status: "resolved"; exerciseId: string; exerciseName: string } | { status: "ambiguous" | "not_found"; reason: string }> {
  const results = await searchExercises(name, excludeExerciseIds);
  const picked = pickByName(results, name, (r) => r.name);

  if (picked.status === "resolved") {
    return { status: "resolved", exerciseId: picked.item.exerciseId, exerciseName: picked.item.name };
  }
  if (picked.status === "ambiguous") {
    return {
      status: "ambiguous",
      reason: `He encontrado varios ejercicios parecidos a "${name}": ${picked.candidates.join(", ")}. ¿Cuál quieres decir?`,
    };
  }
  return { status: "not_found", reason: `No existe ningún ejercicio "${name}" en el catálogo.` };
}

function buildTargetFromRawOp(op: RawCoachActionOp): { ok: true; target: NewRoutineExerciseTarget } | { ok: false; reason: string } {
  const targetSets = op.targetSets;
  if (targetSets == null || !Number.isInteger(targetSets) || targetSets <= 0) {
    return { ok: false, reason: "El número de series no es válido." };
  }

  if (op.targetType === "duration") {
    if (op.targetDurationSeconds == null || op.targetDurationSeconds <= 0) {
      return { ok: false, reason: "Falta la duración objetivo." };
    }
    if (op.targetWeightKg != null && op.targetWeightKg < 0) {
      return { ok: false, reason: "El peso no puede ser negativo." };
    }
    return {
      ok: true,
      target: {
        targetType: "duration",
        targetSets,
        targetRepsMin: null,
        targetRepsMax: null,
        targetDurationSeconds: op.targetDurationSeconds,
        targetWeightKg: op.targetWeightKg,
      },
    };
  }

  if (op.targetRepsMin == null || op.targetRepsMin < 0) {
    return { ok: false, reason: "Faltan las repeticiones mínimas." };
  }
  const targetRepsMax = op.targetRepsMax ?? op.targetRepsMin;
  if (targetRepsMax < op.targetRepsMin) {
    return { ok: false, reason: "El máximo de repeticiones es menor que el mínimo." };
  }
  if (op.targetWeightKg != null && op.targetWeightKg < 0) {
    return { ok: false, reason: "El peso no puede ser negativo." };
  }
  return {
    ok: true,
    target: {
      targetType: "reps",
      targetSets,
      targetRepsMin: op.targetRepsMin,
      targetRepsMax,
      targetDurationSeconds: null,
      targetWeightKg: op.targetWeightKg,
    },
  };
}

async function resolveOp(
  userId: string,
  op: RawCoachActionOp,
): Promise<{ status: "resolved"; op: CoachActionOp } | { status: "rejected"; reason: string } | { status: "ambiguous"; reason: string }> {
  switch (op.type) {
    case "add_routine_to_plan": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const plan = await getActivePlan(userId);
      if (!plan) return { status: "rejected", reason: "No tienes ningún plan activo ahora mismo." };

      return {
        status: "resolved",
        op: {
          type: "add_routine_to_plan",
          planId: plan.id,
          planName: plan.name ?? "tu plan",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
        },
      };
    }

    case "add_exercise": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      if (!op.exerciseName) return { status: "rejected", reason: "Falta el nombre del ejercicio." };
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const detail = await getRoutineDetail(userId, routine.routine.routineId);
      const existingIds = detail?.exercises.map((e) => e.exerciseId) ?? [];
      const exercise = await resolveExerciseFromCatalog(op.exerciseName, existingIds);
      if (exercise.status !== "resolved") {
        if (
          exercise.status === "not_found" &&
          detail?.exercises.some((e) => e.exerciseName.trim().toLowerCase() === op.exerciseName!.trim().toLowerCase())
        ) {
          return { status: "rejected", reason: `"${op.exerciseName}" ya está en la rutina "${routine.routine.name}".` };
        }
        return { status: exercise.status === "ambiguous" ? "ambiguous" : "rejected", reason: exercise.reason };
      }

      const target = buildTargetFromRawOp(op);
      if (!target.ok) return { status: "rejected", reason: target.reason };

      return {
        status: "resolved",
        op: {
          type: "add_exercise",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          target: target.target,
        },
      };
    }

    case "remove_exercise": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      if (!op.exerciseName) return { status: "rejected", reason: "Falta el nombre del ejercicio." };
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const exercise = await resolveExerciseInRoutine(userId, routine.routine.routineId, routine.routine.name, op.exerciseName);
      if (exercise.status !== "resolved") return { status: exercise.status === "ambiguous" ? "ambiguous" : "rejected", reason: exercise.reason };

      return {
        status: "resolved",
        op: {
          type: "remove_exercise",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
          exerciseId: exercise.exercise.exerciseId,
          exerciseName: exercise.exercise.exerciseName,
          snapshot: {
            order: exercise.exercise.order,
            target: {
              targetType: exercise.exercise.targetType,
              targetSets: exercise.exercise.targetSets,
              targetRepsMin: exercise.exercise.targetRepsMin,
              targetRepsMax: exercise.exercise.targetRepsMax,
              targetDurationSeconds: exercise.exercise.targetDurationSeconds,
              targetWeightKg: exercise.exercise.targetWeightKg,
            },
          },
        },
      };
    }

    case "replace_exercise": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      if (!op.exerciseName) return { status: "rejected", reason: "Falta el ejercicio a sustituir." };
      if (!op.newExerciseName) return { status: "rejected", reason: "Falta el ejercicio nuevo." };
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const from = await resolveExerciseInRoutine(userId, routine.routine.routineId, routine.routine.name, op.exerciseName);
      if (from.status !== "resolved") return { status: from.status === "ambiguous" ? "ambiguous" : "rejected", reason: from.reason };

      const detail = await getRoutineDetail(userId, routine.routine.routineId);
      const existingIds = detail?.exercises.map((e) => e.exerciseId) ?? [];
      const to = await resolveExerciseFromCatalog(op.newExerciseName, existingIds);
      if (to.status !== "resolved") return { status: to.status === "ambiguous" ? "ambiguous" : "rejected", reason: to.reason };

      return {
        status: "resolved",
        op: {
          type: "replace_exercise",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
          fromExerciseId: from.exercise.exerciseId,
          fromExerciseName: from.exercise.exerciseName,
          toExerciseId: to.exerciseId,
          toExerciseName: to.exerciseName,
        },
      };
    }

    case "reorder_exercise": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      if (!op.exerciseName) return { status: "rejected", reason: "Falta el nombre del ejercicio." };
      if (op.toPosition == null || !Number.isInteger(op.toPosition) || op.toPosition < 1) {
        return { status: "rejected", reason: "La posición indicada no es válida." };
      }
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const detail = await getRoutineDetail(userId, routine.routine.routineId);
      if (!detail) return { status: "rejected", reason: `La rutina "${routine.routine.name}" ya no existe.` };

      const picked = pickByName(detail.exercises, op.exerciseName, (e) => e.exerciseName);
      if (picked.status === "ambiguous") {
        return { status: "ambiguous", reason: `En "${routine.routine.name}" hay varios ejercicios parecidos a "${op.exerciseName}": ${picked.candidates.join(", ")}. ¿Cuál quieres decir?` };
      }
      if (picked.status === "not_found") {
        return { status: "rejected", reason: `"${op.exerciseName}" no está en la rutina "${routine.routine.name}".` };
      }
      if (op.toPosition > detail.exercises.length) {
        return { status: "rejected", reason: `La rutina "${routine.routine.name}" solo tiene ${detail.exercises.length} ejercicios.` };
      }

      const sorted = [...detail.exercises].sort((a, b) => a.order - b.order);
      const fromPosition = sorted.findIndex((e) => e.exerciseId === picked.item.exerciseId) + 1;

      return {
        status: "resolved",
        op: {
          type: "reorder_exercise",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
          exerciseId: picked.item.exerciseId,
          exerciseName: picked.item.exerciseName,
          toPosition: op.toPosition,
          fromPosition,
        },
      };
    }

    case "update_exercise_target": {
      if (!op.routineName) return { status: "rejected", reason: "Falta el nombre de la rutina." };
      if (!op.exerciseName) return { status: "rejected", reason: "Falta el nombre del ejercicio." };
      if (op.targetSets == null || !Number.isInteger(op.targetSets) || op.targetSets <= 0) {
        return { status: "rejected", reason: "El número de series no es válido." };
      }
      const routine = await resolveRoutineForUser(userId, op.routineName);
      if (routine.status !== "resolved") return { status: routine.status === "ambiguous" ? "ambiguous" : "rejected", reason: routine.reason };

      const exercise = await resolveExerciseInRoutine(userId, routine.routine.routineId, routine.routine.name, op.exerciseName);
      if (exercise.status !== "resolved") return { status: exercise.status === "ambiguous" ? "ambiguous" : "rejected", reason: exercise.reason };

      const current = exercise.exercise;
      const previousTarget: NewRoutineExerciseTarget = {
        targetType: current.targetType,
        targetSets: current.targetSets,
        targetRepsMin: current.targetRepsMin,
        targetRepsMax: current.targetRepsMax,
        targetDurationSeconds: current.targetDurationSeconds,
        targetWeightKg: current.targetWeightKg,
      };

      return {
        status: "resolved",
        op: {
          type: "update_exercise_target",
          routineId: routine.routine.routineId,
          routineName: routine.routine.name,
          exerciseId: current.exerciseId,
          exerciseName: current.exerciseName,
          targetSets: op.targetSets,
          previousTargetSets: current.targetSets,
          // Only targetSets ever changes here -- everything else is the
          // exercise's real current target, composed server-side (never
          // from what the LLM sent), so `updateRoutineExerciseTarget`'s
          // full-row write can never silently blank out reps/weight/duration.
          target: { ...previousTarget, targetSets: op.targetSets },
          previousTarget,
        },
      };
    }

    default:
      return { status: "rejected", reason: "Acción no reconocida." };
  }
}

/**
 * Resolves and validates every op in a batch against real, current data.
 * All-or-nothing (brief §16/§32): one ambiguous or invalid op rejects the
 * whole batch rather than returning a partial preview -- matches
 * `propose_routine_draft`'s existing "resend the full updated draft"
 * convention. Called from both `propose_action` (tools.ts, at proposal
 * time) and `confirmCoachActionAction` (coach/actions.ts, at confirm time
 * for staleness re-validation) -- one validation layer, two call sites.
 */
export async function resolveAndValidateAction(userId: string, raw: RawCoachAction): Promise<CoachActionResolution> {
  if (raw.ops.length === 0) {
    return { status: "rejected", reason: "No hay ningún cambio que proponer." };
  }

  const resolvedOps: CoachActionOp[] = [];
  for (const rawOp of raw.ops) {
    const result = await resolveOp(userId, rawOp);
    if (result.status === "ambiguous") {
      return { status: "ambiguous", question: result.reason };
    }
    if (result.status === "rejected") {
      return { status: "rejected", reason: result.reason };
    }
    resolvedOps.push(result.op);
  }

  return {
    status: "resolved",
    draft: {
      summary: raw.summary,
      ops: resolvedOps,
      destructive: resolvedOps.some((op) => op.type === "remove_exercise"),
    },
  };
}

/**
 * Reconstructs a `RawCoachAction` from an already-resolved `CoachActionDraft`
 * -- used only by `confirmCoachActionAction` to re-run `resolveAndValidateAction`
 * at confirm time. Every `*Name` field on a resolved op is already the
 * canonical (exact) name, so re-resolving it always hits the exact-match
 * branch in `pickByName` -- this never re-introduces ambiguity by itself,
 * it only lets staleness (the entity no longer existing/matching) surface.
 */
export function toRawAction(draft: CoachActionDraft): RawCoachAction {
  return {
    summary: draft.summary,
    ops: draft.ops.map((op): RawCoachActionOp => {
      const base: RawCoachActionOp = {
        type: op.type,
        routineName: null,
        exerciseName: null,
        newExerciseName: null,
        targetType: null,
        targetSets: null,
        targetRepsMin: null,
        targetRepsMax: null,
        targetDurationSeconds: null,
        targetWeightKg: null,
        restSeconds: null,
        toPosition: null,
      };

      switch (op.type) {
        case "add_routine_to_plan":
          return { ...base, routineName: op.routineName };
        case "add_exercise":
          return {
            ...base,
            routineName: op.routineName,
            exerciseName: op.exerciseName,
            targetType: op.target.targetType,
            targetSets: op.target.targetSets,
            targetRepsMin: op.target.targetRepsMin,
            targetRepsMax: op.target.targetRepsMax,
            targetDurationSeconds: op.target.targetDurationSeconds,
            targetWeightKg: op.target.targetWeightKg,
          };
        case "remove_exercise":
          return { ...base, routineName: op.routineName, exerciseName: op.exerciseName };
        case "replace_exercise":
          return { ...base, routineName: op.routineName, exerciseName: op.fromExerciseName, newExerciseName: op.toExerciseName };
        case "reorder_exercise":
          return { ...base, routineName: op.routineName, exerciseName: op.exerciseName, toPosition: op.toPosition };
        case "update_exercise_target":
          return { ...base, routineName: op.routineName, exerciseName: op.exerciseName, targetSets: op.targetSets };
      }
    }),
  };
}

/** Deep structural comparison of the write-relevant parts of two resolutions -- `summary` is cosmetic and excluded. Used by `confirmCoachActionAction` to detect drift between what was previewed and what's true right now. */
export function draftsMatch(a: CoachActionDraft, b: CoachActionDraft): boolean {
  return JSON.stringify(a.ops) === JSON.stringify(b.ops);
}
