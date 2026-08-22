import "server-only";

import { searchExercises } from "@/lib/domain/exercises";

/**
 * The LLM never sees or invents a real `exerciseId` (brief §33) -- it can
 * only name what it wants. `RawRoutineDraft` is exactly what the model's
 * structured output (`ROUTINE_DRAFT_SCHEMA` below) produces; `resolveRoutineDraft`
 * turns it into a `RoutineDraft` by resolving each name against the real
 * catalog (`searchExercises`, the same function Exercise Search uses --
 * no second catalog, no second lookup path).
 */

export type RawRoutineDraftExercise = {
  exerciseName: string;
  order: number;
  sets: number;
  targetType: "reps" | "duration";
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
  targetWeightKg: number | null;
  restSeconds: number | null;
};

export type RawRoutineDraft = {
  name: string;
  description: string | null;
  exercises: RawRoutineDraftExercise[];
};

/** Same target shape `RoutineDetailExercise`/`NewRoutineExerciseTarget` already use -- no invented fields. */
export type RoutineDraftExercise = {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  targetType: "reps" | "duration";
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
  targetWeightKg: number | null;
  restSeconds: number | null;
};

export type RoutineDraft = {
  name: string;
  description: string | null;
  exercises: RoutineDraftExercise[];
};

/**
 * The JSON Schema handed to the Responses API as `text.format` /
 * `parameters` (structured output, brief §32 -- never a free-text string
 * we regex-parse). Every numeric target field is nullable rather than
 * optional: OpenAI's `strict: true` structured-output mode requires every
 * property to be listed in `required`, so "not applicable" has to be
 * expressed as `null`, not as an absent key.
 */
export const ROUTINE_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          exerciseName: { type: "string" },
          order: { type: "integer" },
          sets: { type: "integer" },
          targetType: { type: "string", enum: ["reps", "duration"] },
          targetRepsMin: { type: ["integer", "null"] },
          targetRepsMax: { type: ["integer", "null"] },
          targetDurationSeconds: { type: ["integer", "null"] },
          targetWeightKg: { type: ["number", "null"] },
          restSeconds: { type: ["integer", "null"] },
        },
        required: [
          "exerciseName",
          "order",
          "sets",
          "targetType",
          "targetRepsMin",
          "targetRepsMax",
          "targetDurationSeconds",
          "targetWeightKg",
          "restSeconds",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "description", "exercises"],
  additionalProperties: false,
} as const;

export type RoutineDraftResolution = {
  draft: RoutineDraft | null;
  /** Exercise names the LLM proposed that don't exist in the real catalog -- never silently substituted (brief §18). */
  unresolvedNames: string[];
};

/**
 * Resolves one free-text exercise name against the real catalog via the
 * exact same `searchExercises` Exercise Search already uses. Exact
 * (case-insensitive) name match first; otherwise the top search result is
 * accepted only when the query and the result name share a real substring
 * relationship (a conservative fuzzy match -- "bench press" matching
 * "Barbell Bench Press" is a reasonable alternative, "bench press"
 * matching an unrelated top hit is not). Shared by Routine Draft
 * resolution and the `getExerciseProgression` tool -- one resolution rule,
 * not two.
 */
export async function resolveExerciseByName(
  name: string,
): Promise<{ exerciseId: string; name: string } | null> {
  const results = await searchExercises(name, []);
  const query = name.trim().toLowerCase();

  const exact = results.find((r) => r.name.trim().toLowerCase() === query);
  const fuzzy =
    exact ??
    results.find((r) => {
      const resultName = r.name.trim().toLowerCase();
      return resultName.includes(query) || query.includes(resultName);
    });

  return fuzzy ? { exerciseId: fuzzy.exerciseId, name: fuzzy.name } : null;
}

/**
 * Resolves every exercise in a raw LLM draft against the real catalog.
 * Anything unresolved is reported, never guessed into a wrong exerciseId.
 */
export async function resolveRoutineDraft(raw: RawRoutineDraft): Promise<RoutineDraftResolution> {
  const unresolvedNames: string[] = [];
  const resolved: RoutineDraftExercise[] = [];

  for (const exercise of raw.exercises) {
    const match = await resolveExerciseByName(exercise.exerciseName);

    if (!match) {
      unresolvedNames.push(exercise.exerciseName);
      continue;
    }

    resolved.push({
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

  if (unresolvedNames.length > 0 || resolved.length === 0) {
    return { draft: null, unresolvedNames };
  }

  return {
    draft: { name: raw.name, description: raw.description, exercises: resolved },
    unresolvedNames: [],
  };
}

export type RoutineDraftValidation = { valid: true } | { valid: false; errors: string[] };

/**
 * Business rules (brief §34) -- the same shape `routine_exercises`' own
 * CHECK constraints enforce (`routine_exercises_target_type_coherent`,
 * `target_sets > 0`, `target_reps_max >= target_reps_min`), checked here
 * so an invalid Draft is rejected before the user ever sees a preview,
 * not after a future write attempt.
 */
export function validateRoutineDraft(draft: RoutineDraft): RoutineDraftValidation {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push("La rutina no tiene nombre.");
  }
  if (draft.exercises.length === 0) {
    errors.push("La rutina no tiene ejercicios.");
  }

  const seenOrders = new Set<number>();
  for (const exercise of draft.exercises) {
    const label = exercise.exerciseName || `posición ${exercise.order}`;

    if (!exercise.exerciseId) {
      errors.push(`${label}: falta el ejercicio resuelto contra el catálogo.`);
    }
    if (seenOrders.has(exercise.order)) {
      errors.push(`${label}: orden ${exercise.order} duplicado.`);
    }
    seenOrders.add(exercise.order);

    if (!Number.isInteger(exercise.sets) || exercise.sets <= 0) {
      errors.push(`${label}: el número de series debe ser mayor que 0.`);
    }

    if (exercise.targetType === "reps") {
      if (exercise.targetRepsMin == null || exercise.targetRepsMin < 0) {
        errors.push(`${label}: faltan las repeticiones mínimas.`);
      } else if (exercise.targetRepsMax != null && exercise.targetRepsMax < exercise.targetRepsMin) {
        errors.push(`${label}: el máximo de repeticiones es menor que el mínimo.`);
      }
    } else {
      if (exercise.targetDurationSeconds == null || exercise.targetDurationSeconds <= 0) {
        errors.push(`${label}: falta la duración objetivo.`);
      }
    }

    if (exercise.targetWeightKg != null && exercise.targetWeightKg < 0) {
      errors.push(`${label}: el peso no puede ser negativo.`);
    }
    if (exercise.restSeconds != null && exercise.restSeconds < 0) {
      errors.push(`${label}: el descanso no puede ser negativo.`);
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
