import "server-only";

import { getUserRoutines } from "@/lib/domain/routines";

import { ROUTINE_DRAFT_SCHEMA, resolveExerciseByName, validateRoutineDraft } from "./routine-draft";
import type { RawRoutineDraftExercise, RoutineDraftExercise } from "./routine-draft";

/**
 * The create-a-NEW-plan counterpart of `RoutineDraft` (routine-draft.ts) --
 * a direct twin of the same pattern (raw LLM shape, names only -> resolve
 * against real data -> validate -> preview -> confirm), because creating a
 * plan is one coherent object, not a batch of ops on something that
 * already exists (see action-draft.ts's own header comment for why EDITING
 * an existing plan is an ops extension there instead). Each routine
 * reference can point to one of the user's own existing routines (resolved
 * by name) or describe a brand-new routine to create alongside the plan
 * (reusing `RawRoutineDraftExercise`'s exact shape, resolved the same way
 * `RoutineDraft` resolves its own exercises) -- one draft, one preview, one
 * confirmation, even when it mixes both kinds of routine.
 */

export type RawPlanRoutineRef = {
  /** true = create a brand-new routine (see newRoutineName/newRoutineExercises); false = use one of the user's existing routines (see existingRoutineName). */
  isNew: boolean;
  existingRoutineName: string | null;
  newRoutineName: string | null;
  newRoutineExercises: RawRoutineDraftExercise[];
};

export type RawPlanDraft = {
  name: string;
  routines: RawPlanRoutineRef[];
  /** Set from the user's own phrasing ("...y actívalo") -- never assumed. Resolved server-side (never trusted beyond this boolean) the same way RoutineDraft's addToActivePlan is. */
  activateOnCreate: boolean;
};

export type PlanDraftRoutineRef =
  | { kind: "existing"; routineId: string; routineName: string }
  | { kind: "new"; name: string; exercises: RoutineDraftExercise[] };

export type PlanDraft = {
  name: string;
  routines: PlanDraftRoutineRef[];
  activateOnCreate: boolean;
};

/** Same strict-mode JSON Schema convention `ROUTINE_DRAFT_SCHEMA` establishes -- every field nullable rather than optional. Reuses that schema's own exercise item shape for a new routine's exercises, rather than a second copy of the same fields. */
export const PLAN_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    activateOnCreate: {
      type: "boolean",
      description: "true only if the user explicitly asked for this plan to become their active plan when created.",
    },
    routines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          isNew: {
            type: "boolean",
            description: "true to create a brand-new routine as part of this plan, false to use one of the user's existing routines.",
          },
          existingRoutineName: {
            type: ["string", "null"],
            description: "Required (non-null) when isNew is false -- a real routine name, exactly as the user said it.",
          },
          newRoutineName: {
            type: ["string", "null"],
            description: "Required (non-null) when isNew is true -- the new routine's name.",
          },
          newRoutineExercises: {
            type: "array",
            items: ROUTINE_DRAFT_SCHEMA.properties.exercises.items,
            description: "Only used when isNew is true -- verify every exerciseName with searchExercises first, same as propose_routine_draft.",
          },
        },
        required: ["isNew", "existingRoutineName", "newRoutineName", "newRoutineExercises"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "activateOnCreate", "routines"],
  additionalProperties: false,
} as const;

/**
 * Same resolution rule `resolveExerciseByName` uses for the catalog,
 * targeting the user's own routine library instead. Exported: also used
 * directly by `confirmCreatePlanAction` (coach/actions.ts) to re-verify an
 * "existing routine" reference is still valid at confirm time, the same
 * way that Server Action already reuses `resolveExerciseByName` itself for
 * fresh exercises.
 */
export async function resolveExistingRoutineByName(userId: string, name: string): Promise<{ routineId: string; name: string } | null> {
  const routines = await getUserRoutines(userId);
  const query = name.trim().toLowerCase();

  const exact = routines.find((r) => r.name.trim().toLowerCase() === query);
  const fuzzy =
    exact ??
    routines.find((r) => {
      const routineName = r.name.trim().toLowerCase();
      return routineName.includes(query) || query.includes(routineName);
    });

  return fuzzy ? { routineId: fuzzy.routineId, name: fuzzy.name } : null;
}

export type PlanDraftResolution = {
  draft: PlanDraft | null;
  /** Routine names (existing) that don't match any of the user's real routines -- never silently substituted. */
  unresolvedRoutineNames: string[];
  /** Exercise names (inside a new-routine entry) that don't exist in the real catalog. */
  unresolvedExerciseNames: string[];
};

/** Resolves every routine reference in a raw LLM plan draft against real data. Anything unresolved is reported, never guessed into a wrong id. */
export async function resolvePlanDraft(userId: string, raw: RawPlanDraft): Promise<PlanDraftResolution> {
  const unresolvedRoutineNames: string[] = [];
  const unresolvedExerciseNames: string[] = [];
  const resolved: PlanDraftRoutineRef[] = [];

  for (const ref of raw.routines) {
    if (ref.isNew) {
      if (!ref.newRoutineName || !ref.newRoutineName.trim()) {
        unresolvedRoutineNames.push("(rutina nueva sin nombre)");
        continue;
      }

      const exercises: RoutineDraftExercise[] = [];
      let anyExerciseUnresolved = false;
      for (const exercise of ref.newRoutineExercises) {
        const match = await resolveExerciseByName(exercise.exerciseName);
        if (!match) {
          unresolvedExerciseNames.push(exercise.exerciseName);
          anyExerciseUnresolved = true;
          continue;
        }
        exercises.push({
          exerciseId: match.exerciseId,
          exerciseName: match.name,
          order: exercise.order,
          sets: exercise.sets,
          targetType: exercise.targetType,
          targetRepsMin: exercise.targetRepsMin,
          targetRepsMax: exercise.targetRepsMax,
          targetDurationSeconds: exercise.targetDurationSeconds,
          targetWeightKg: exercise.targetWeightKg,
          restSeconds: exercise.restSeconds,
        });
      }
      if (anyExerciseUnresolved) {
        continue;
      }

      resolved.push({ kind: "new", name: ref.newRoutineName.trim(), exercises });
      continue;
    }

    if (!ref.existingRoutineName) {
      unresolvedRoutineNames.push("(nombre de rutina vacío)");
      continue;
    }
    const match = await resolveExistingRoutineByName(userId, ref.existingRoutineName);
    if (!match) {
      unresolvedRoutineNames.push(ref.existingRoutineName);
      continue;
    }
    resolved.push({ kind: "existing", routineId: match.routineId, routineName: match.name });
  }

  if (unresolvedRoutineNames.length > 0 || unresolvedExerciseNames.length > 0 || resolved.length === 0) {
    return { draft: null, unresolvedRoutineNames, unresolvedExerciseNames };
  }

  return {
    draft: { name: raw.name, routines: resolved, activateOnCreate: raw.activateOnCreate },
    unresolvedRoutineNames: [],
    unresolvedExerciseNames: [],
  };
}

export type PlanDraftValidation = { valid: true } | { valid: false; errors: string[] };

/**
 * Business rules, mirroring `validateRoutineDraft`'s own shape. Reuses that
 * exact function for each "new" routine reference's own exercises (via a
 * throwaway `RoutineDraft` wrapper) rather than a second copy of the same
 * per-exercise checks.
 */
export function validatePlanDraft(draft: PlanDraft): PlanDraftValidation {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push("El plan no tiene nombre.");
  }
  if (draft.routines.length === 0) {
    errors.push("El plan no tiene rutinas.");
  }

  for (const ref of draft.routines) {
    if (ref.kind !== "new") {
      continue;
    }
    const routineValidation = validateRoutineDraft({
      name: ref.name,
      description: null,
      exercises: ref.exercises,
      addToActivePlan: false,
      activePlanName: null,
    });
    if (!routineValidation.valid) {
      errors.push(...routineValidation.errors.map((error) => `${ref.name || "rutina nueva"}: ${error}`));
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
