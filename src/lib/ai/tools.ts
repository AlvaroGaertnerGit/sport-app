import "server-only";

import { searchExercises } from "@/lib/domain/exercises";
import { getActivePlan, getPlanItems } from "@/lib/domain/plans";
import { getProgressSummary } from "@/lib/domain/progress";
import { getActivePlanExerciseProgressions, getRoutineExerciseProgressions } from "@/lib/domain/progression";
import { getRoutineDetail } from "@/lib/domain/routines";
import { getSessionHistory } from "@/lib/domain/history";
import { getTodayRecommendation } from "@/lib/domain/today";
import type { ProgressionExerciseInput } from "@/lib/domain/progression";

import { ROUTINE_DRAFT_SCHEMA, resolveExerciseByName, resolveRoutineDraft, validateRoutineDraft } from "./routine-draft";
import type { CoachToolDefinition } from "./provider";
import type { RawRoutineDraft, RoutineDraft } from "./routine-draft";

/**
 * Read-only tools (brief §11-18) plus one structured-output action tool
 * (`propose_routine_draft`, brief §30-38) -- all six read tools call an
 * *existing* domain function and shape its result into FACTS (brief §9):
 * plain data, no generated prose. `propose_routine_draft` is the one
 * exception that has a side effect worth surfacing to the UI (the resolved
 * Draft itself), reported back via `CoachToolResult.sideEffect` rather than
 * ever writing to Supabase -- resolution and validation only.
 */

const FIXED_PERIOD = "30d" as const;
const DEFAULT_SESSIONS_LIMIT = 10;
const MAX_SESSIONS_LIMIT = 20;

export type CoachToolResult = {
  /** JSON string -- becomes the `function_call_output.output` sent back to the model. */
  output: string;
  sideEffect?: { type: "routine_draft"; draft: RoutineDraft } | { type: "routine_draft_rejected"; reason: string };
};

function ok(data: unknown): CoachToolResult {
  return { output: JSON.stringify(data) };
}

async function toolGetTrainingSummary(userId: string): Promise<CoachToolResult> {
  const summary = await getProgressSummary(userId, FIXED_PERIOD);
  return ok({
    period: "30d",
    hasData: summary.hasData,
    workoutsCompleted: summary.workoutsCompleted,
    workoutsAbandoned: summary.workoutsAbandoned,
    trainingMinutes: summary.trainingMinutes,
    averageDurationMinutes: summary.averageDurationMinutes,
    sessionsPerWeek: summary.sessionsPerWeek,
    currentStreakDays: summary.currentStreakDays,
    bestStreakDays: summary.bestStreakDays,
    activeDays: summary.activeDays,
    topExercises: summary.topExercises,
    personalBests: summary.personalBests,
  });
}

async function toolGetExerciseProgression(userId: string, args: { exerciseName: string }): Promise<CoachToolResult> {
  const match = await resolveExerciseByName(args.exerciseName);
  if (!match) {
    return ok({ found: false, reason: `No existe ningún ejercicio "${args.exerciseName}" en el catálogo.` });
  }

  const planProgressions = await getActivePlanExerciseProgressions(userId);
  const entries = planProgressions.filter((p) => p.exerciseId === match.exerciseId);
  if (entries.length === 0) {
    return ok({
      found: true,
      exerciseName: match.name,
      inActivePlan: false,
      reason: "Este ejercicio no forma parte de tu plan activo, así que no hay progresión calculada para él.",
    });
  }

  return ok({
    found: true,
    exerciseName: match.name,
    inActivePlan: true,
    // One routine can appear more than once across a plan only if the user
    // added it twice -- reporting every occurrence rather than picking one
    // keeps this honest instead of arbitrarily dropping data.
    occurrences: entries.map((entry) => ({
      routineName: entry.routineName,
      status: entry.progression.status,
      sessionsConsidered: entry.progression.sessionsConsidered,
      reason: entry.progression.reason,
      last: entry.progression.last,
      next: entry.progression.next,
    })),
  });
}

async function toolGetRecentSessions(userId: string, args: { limit?: number }): Promise<CoachToolResult> {
  const limit = Math.min(args.limit && args.limit > 0 ? args.limit : DEFAULT_SESSIONS_LIMIT, MAX_SESSIONS_LIMIT);
  const sessions = await getSessionHistory(userId, limit);
  return ok(
    sessions.map((s) => ({
      startedAt: s.startedAt,
      routineName: s.routineName,
      status: s.status,
      exerciseCount: s.exerciseCount,
      durationMinutes: s.durationMinutes,
    })),
  );
}

async function toolGetCurrentPlan(userId: string): Promise<CoachToolResult> {
  const plan = await getActivePlan(userId);
  if (!plan) {
    return ok({ hasActivePlan: false });
  }
  const items = await getPlanItems(userId, plan.id);
  const routines = await Promise.all(
    items.map(async (item) => {
      const detail = await getRoutineDetail(userId, item.routineId);
      return {
        order: item.order,
        routineName: item.routineName,
        exerciseNames: detail?.exercises.map((e) => e.exerciseName) ?? [],
      };
    }),
  );
  return ok({ hasActivePlan: true, planName: plan.name, routines });
}

async function toolGetTodayWorkout(userId: string): Promise<CoachToolResult> {
  const recommendation = await getTodayRecommendation(userId);

  if (recommendation.type === "no_plan" || recommendation.type === "empty_plan" || recommendation.type === "error") {
    return ok({ type: recommendation.type });
  }

  if (!recommendation.routineId) {
    return ok({ type: recommendation.type, routineName: recommendation.routineName });
  }

  const detail = await getRoutineDetail(userId, recommendation.routineId);
  if (!detail) {
    return ok({ type: recommendation.type, routineName: recommendation.routineName });
  }

  // Smart Targets overlay -- the exact same read Workout's own page uses to
  // seed its steppers, reused unchanged so Coach never disagrees with what
  // the user would actually see if they started the session right now.
  const progressionInputs: ProgressionExerciseInput[] = detail.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    targetType: e.targetType,
    targetSets: e.targetSets,
    targetRepsMin: e.targetRepsMin,
    targetRepsMax: e.targetRepsMax,
    targetDurationSeconds: e.targetDurationSeconds,
    targetWeightKg: e.targetWeightKg,
  }));
  const progressions = await getRoutineExerciseProgressions(userId, recommendation.routineId, progressionInputs);

  return ok({
    type: recommendation.type,
    routineName: detail.name,
    exercises: detail.exercises.map((e) => ({
      exerciseName: e.exerciseName,
      targetSets: e.targetSets,
      targetType: e.targetType,
      targetRepsMin: e.targetRepsMin,
      targetRepsMax: e.targetRepsMax,
      targetDurationSeconds: e.targetDurationSeconds,
      targetWeightKg: e.targetWeightKg,
      recommendedNext: progressions.get(e.exerciseId)?.next ?? null,
    })),
  });
}

async function toolSearchExercises(args: { query: string }): Promise<CoachToolResult> {
  const results = await searchExercises(args.query, []);
  return ok(results.slice(0, 15).map((r) => ({ name: r.name, primaryMuscles: r.primaryMuscles })));
}

async function toolProposeRoutineDraft(raw: RawRoutineDraft): Promise<CoachToolResult> {
  const { draft, unresolvedNames } = await resolveRoutineDraft(raw);
  if (!draft) {
    const reason =
      unresolvedNames.length > 0
        ? `Estos ejercicios no existen en el catálogo: ${unresolvedNames.join(", ")}.`
        : "La rutina propuesta no tiene ejercicios.";
    return {
      output: JSON.stringify({ accepted: false, reason }),
      sideEffect: { type: "routine_draft_rejected", reason },
    };
  }

  const validation = validateRoutineDraft(draft);
  if (!validation.valid) {
    const reason = validation.errors.join(" ");
    return {
      output: JSON.stringify({ accepted: false, reason }),
      sideEffect: { type: "routine_draft_rejected", reason },
    };
  }

  return {
    output: JSON.stringify({ accepted: true, draft }),
    sideEffect: { type: "routine_draft", draft },
  };
}

export const COACH_TOOLS: CoachToolDefinition[] = [
  {
    type: "function",
    name: "getTrainingSummary",
    description: "Resumen de entrenamiento del usuario en los últimos 30 días: sesiones, frecuencia, racha, mejores marcas.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "getExerciseProgression",
    description:
      "Progresión determinista de un ejercicio concreto (calculada por el Progression Engine, nunca inventada). Usar el nombre del ejercicio tal como lo dice el usuario.",
    parameters: {
      type: "object",
      properties: { exerciseName: { type: "string" } },
      required: ["exerciseName"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "getRecentSessions",
    description: "Lista compacta de las sesiones de entrenamiento más recientes del usuario (fecha, rutina, estado).",
    parameters: {
      type: "object",
      properties: { limit: { type: ["integer", "null"], description: "Máximo de sesiones, por defecto 10." } },
      required: ["limit"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "getCurrentPlan",
    description: "El plan activo del usuario: sus rutinas, en orden de rotación, con los nombres de sus ejercicios.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "getTodayWorkout",
    description: "Qué le toca entrenar hoy al usuario según su plan y rotación, con los objetivos recomendados por el Progression Engine.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "searchExercises",
    description:
      "Busca ejercicios reales en el catálogo de Sport Coach por nombre. Usar SIEMPRE antes de proponer un ejercicio en una rutina, para comprobar que existe.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "propose_routine_draft",
    description:
      "Propone un borrador de rutina (Routine Draft) para que el usuario lo revise. NO crea nada en la base de datos. Usar exerciseName con nombres reales verificados con searchExercises -- si un ejercicio no existe en el catálogo, el draft será rechazado.",
    parameters: ROUTINE_DRAFT_SCHEMA,
    strict: true,
  },
];

export async function executeCoachTool(userId: string, name: string, argsJson: string): Promise<CoachToolResult> {
  const args = argsJson ? JSON.parse(argsJson) : {};

  switch (name) {
    case "getTrainingSummary":
      return toolGetTrainingSummary(userId);
    case "getExerciseProgression":
      return toolGetExerciseProgression(userId, args);
    case "getRecentSessions":
      return toolGetRecentSessions(userId, args);
    case "getCurrentPlan":
      return toolGetCurrentPlan(userId);
    case "getTodayWorkout":
      return toolGetTodayWorkout(userId);
    case "searchExercises":
      return toolSearchExercises(args);
    case "propose_routine_draft":
      return toolProposeRoutineDraft(args as RawRoutineDraft);
    default:
      return ok({ error: `Unknown tool: ${name}` });
  }
}
