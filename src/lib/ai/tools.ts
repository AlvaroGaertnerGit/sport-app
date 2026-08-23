import "server-only";

import { getCoachSummary } from "@/lib/domain/coach";
import { searchExercises } from "@/lib/domain/exercises";
import { getActivePlan, getPlanItems } from "@/lib/domain/plans";
import { getProgressSummary } from "@/lib/domain/progress";
import { getActivePlanExerciseProgressions, getRoutineExerciseProgressions } from "@/lib/domain/progression";
import { getRoutineDetail, getRoutineExerciseNames } from "@/lib/domain/routines";
import { getRecentSessionsForMuscleGroups, getSessionHistory } from "@/lib/domain/history";
import { getTodayRecommendation } from "@/lib/domain/today";
import type { ProgressionExerciseInput } from "@/lib/domain/progression";

import { ROUTINE_DRAFT_SCHEMA, resolveExerciseByName, resolveRoutineDraft, validateRoutineDraft } from "./routine-draft";
import { resolveAndValidateAction } from "./action-draft";
import type { CoachToolDefinition } from "./provider";
import type { RawRoutineDraft, RoutineDraft } from "./routine-draft";
import type { CoachActionDraft, RawCoachAction } from "./action-draft";

/**
 * Read-only tools plus two structured-output tools with a side effect
 * (`propose_routine_draft`, `propose_action`) -- every read tool calls an
 * *existing* domain function and shapes its result into FACTS: plain data,
 * no generated prose, no recalculated numbers. `getProgressOverview` and
 * `getRecentTrainingForMuscleGroup` (Training Intelligence phase) are no
 * exception -- the first wraps `getCoachSummary` verbatim (the same read
 * the Coach page's own header uses), the second wraps a single new,
 * narrowly-scoped domain read (`getRecentSessionsForMuscleGroups`) rather
 * than a second progression/frequency calculation. The two propose_* tools
 * are the only ones with a side effect worth surfacing to the UI (a Draft
 * to review), reported back via `CoachToolResult.sideEffect` rather than
 * ever writing to Supabase -- resolution and validation only.
 */

const FIXED_PERIOD = "30d" as const;
const DEFAULT_SESSIONS_LIMIT = 10;
const MAX_SESSIONS_LIMIT = 20;

/** The exercise catalog's real, closed `primary_muscles` taxonomy (confirmed against live data) -- the only values `getRecentTrainingForMuscleGroup` can ever match against. Mapping a user's own word ("espalda", "piernas") to one or more of these is the model's job (see the tool's own description); this list exists so the model can only ever pass a real value, never invent one. */
const MUSCLE_GROUPS = [
  "back",
  "biceps",
  "calves",
  "chest",
  "core",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "quadriceps",
  "shoulders",
  "triceps",
] as const;

export type CoachToolResult = {
  /** JSON string -- becomes the `function_call_output.output` sent back to the model. */
  output: string;
  sideEffect?:
    | { type: "routine_draft"; draft: RoutineDraft }
    | { type: "routine_draft_rejected"; reason: string }
    | { type: "action_draft"; draft: CoachActionDraft }
    | { type: "action_rejected"; reason: string };
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

/**
 * Was N+1: one `getRoutineDetail` call (2 queries, plus `sportName` and
 * every target field fetched and discarded) per plan item -- 12+ queries
 * for a 6-item plan. `getRoutineExerciseNames` fetches every distinct
 * routine's exercise names in one query regardless of plan size (and a
 * routine repeated in the rotation, e.g. "Piernas" twice, is only fetched
 * once) -- 3 queries total no matter how many routines the plan has.
 */
async function toolGetCurrentPlan(userId: string): Promise<CoachToolResult> {
  const plan = await getActivePlan(userId);
  if (!plan) {
    return ok({ hasActivePlan: false });
  }
  const items = await getPlanItems(userId, plan.id);
  const distinctRoutineIds = [...new Set(items.map((item) => item.routineId))];
  const exerciseNamesByRoutine = await getRoutineExerciseNames(userId, distinctRoutineIds);
  const routines = items.map((item) => ({
    order: item.order,
    routineName: item.routineName,
    exerciseNames: (exerciseNamesByRoutine.get(item.routineId) ?? []).map((e) => e.exerciseName),
  }));
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
      // status/reason expose *why* recommendedNext equals or differs from
      // the routine's own target -- without these the model can't tell
      // "the engine says maintain" apart from "there isn't enough history
      // yet", even though both cases return the same recommendedNext value.
      progressionStatus: progressions.get(e.exerciseId)?.status ?? null,
      progressionReason: progressions.get(e.exerciseId)?.reason ?? null,
    })),
  });
}

/**
 * Wraps `getCoachSummary` unchanged -- the exact same read the Coach page's
 * own deterministic header uses (brief §19/§29: reuse, never a second
 * calculation). Baseline context (context.ts) deliberately only carries the
 * *counts* of improving/maintaining; this tool is the on-demand call for
 * the actual named exercises, so a question like "¿qué estoy mejorando?"
 * doesn't require inflating every turn's context with a list most turns
 * never need.
 */
async function toolGetProgressOverview(userId: string): Promise<CoachToolResult> {
  const summary = await getCoachSummary(userId);
  return ok({
    hasData: summary.hasData,
    workoutsCompleted30d: summary.workoutsCompleted,
    sessionsPerWeek: summary.sessionsPerWeek,
    currentStreakDays: summary.currentStreakDays,
    improving: summary.improving,
    maintaining: summary.maintaining,
    insufficientData: summary.insufficientData,
  });
}

/** `muscleGroups` must already be real taxonomy values -- resolved by `resolveMuscleGroups`, never trusted raw from the model (mirrors every other name-resolution boundary in this codebase). */
function resolveMuscleGroups(requested: readonly string[]): string[] {
  const valid = new Set<string>(MUSCLE_GROUPS);
  return requested.filter((m): m is (typeof MUSCLE_GROUPS)[number] => valid.has(m));
}

async function toolGetRecentTrainingForMuscleGroup(userId: string, args: { muscleGroups: string[] }): Promise<CoachToolResult> {
  const muscleGroups = resolveMuscleGroups(args.muscleGroups ?? []);
  if (muscleGroups.length === 0) {
    return ok({ found: false, reason: "No se ha reconocido ningún grupo muscular válido en la petición." });
  }

  const sessions = await getRecentSessionsForMuscleGroups(userId, muscleGroups, DEFAULT_SESSIONS_LIMIT);
  return ok({
    found: true,
    muscleGroups,
    sessions: sessions.map((s) => ({
      startedAt: s.startedAt,
      routineName: s.routineName,
      status: s.status,
      matchedExerciseNames: s.matchedExerciseNames,
    })),
  });
}

async function toolSearchExercises(args: { query: string }): Promise<CoachToolResult> {
  const results = await searchExercises(args.query, []);
  return ok(results.slice(0, 15).map((r) => ({ name: r.name, primaryMuscles: r.primaryMuscles })));
}

async function toolProposeRoutineDraft(userId: string, raw: RawRoutineDraft): Promise<CoachToolResult> {
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

  // Resolved against the real active plan -- never trusts a plan identity
  // from the model, only its `addToActivePlan` intent (brief §37/§38).
  if (draft.addToActivePlan) {
    const plan = await getActivePlan(userId);
    draft.activePlanName = plan?.name ?? null;
  }

  return {
    output: JSON.stringify({ accepted: true, draft }),
    sideEffect: { type: "routine_draft", draft },
  };
}

/**
 * Flat, every field nullable-not-optional -- matches `ROUTINE_DRAFT_SCHEMA`'s
 * existing convention (OpenAI's `strict: true` requires every property
 * listed in `required`, so "not applicable to this op type" is expressed
 * as `null`, never an absent key). One tool, not seven, so a natural
 * multi-step request ("quita fondos y pon press banca primero") becomes
 * one `ops: [...]` batch with one preview and one confirmation, matching
 * brief §16.
 */
export const PROPOSE_ACTION_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["add_routine_to_plan", "add_exercise", "remove_exercise", "replace_exercise", "reorder_exercise", "update_exercise_target"],
          },
          routineName: { type: ["string", "null"] },
          exerciseName: { type: ["string", "null"] },
          newExerciseName: { type: ["string", "null"], description: "replace_exercise's destination exercise only." },
          targetType: { type: ["string", "null"], enum: ["reps", "duration", null] },
          targetSets: { type: ["integer", "null"] },
          targetRepsMin: { type: ["integer", "null"] },
          targetRepsMax: { type: ["integer", "null"] },
          targetDurationSeconds: { type: ["integer", "null"] },
          targetWeightKg: { type: ["number", "null"] },
          restSeconds: { type: ["integer", "null"] },
          toPosition: { type: ["integer", "null"], description: "reorder_exercise only, 1-based." },
        },
        required: [
          "type",
          "routineName",
          "exerciseName",
          "newExerciseName",
          "targetType",
          "targetSets",
          "targetRepsMin",
          "targetRepsMax",
          "targetDurationSeconds",
          "targetWeightKg",
          "restSeconds",
          "toPosition",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "ops"],
  additionalProperties: false,
} as const;

async function toolProposeAction(userId: string, raw: RawCoachAction): Promise<CoachToolResult> {
  const resolution = await resolveAndValidateAction(userId, raw);

  if (resolution.status === "ambiguous") {
    return ok({ resolved: false, reason: resolution.question });
  }
  if (resolution.status === "rejected") {
    return {
      output: JSON.stringify({ accepted: false, reason: resolution.reason }),
      sideEffect: { type: "action_rejected", reason: resolution.reason },
    };
  }

  return {
    output: JSON.stringify({ accepted: true, draft: resolution.draft }),
    sideEffect: { type: "action_draft", draft: resolution.draft },
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
    description:
      "Qué le toca entrenar hoy al usuario según su plan y rotación, con los objetivos recomendados por el Progression Engine. Cada ejercicio incluye progressionStatus ('maintain', 'progress', 'complete' o 'insufficient_data') y progressionReason -- usar ambos para explicar el porqué; recommendedNext puede ser igual al objetivo actual tanto porque el motor recomienda mantenerlo como porque todavía no hay datos suficientes, y esos dos casos no son lo mismo.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "getProgressOverview",
    description:
      "Qué ejercicios del plan activo del usuario están mejorando, cuáles se están manteniendo, y cuáles no tienen datos suficientes todavía -- calculado por el Progression Engine, nunca inventado. Usar para preguntas como '¿qué estoy mejorando?' o '¿cómo voy en general?'.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: "function",
    name: "getRecentTrainingForMuscleGroup",
    description: `Sesiones recientes del usuario que entrenaron uno o más grupos musculares concretos, con qué ejercicios exactamente. Usar para preguntas como '¿cuándo entrené espalda?' o '¿he hecho piernas esta semana?'. muscleGroups debe ser uno o más valores reales del catálogo (nunca inventar uno): ${MUSCLE_GROUPS.join(", ")}. Traducir la palabra del usuario a estos valores -- por ejemplo espalda -> back y lats; pecho -> chest; hombros -> shoulders; piernas -> quadriceps, hamstrings, glutes y calves; brazos -> biceps, triceps y forearms; core/abdomen -> core.`,
    parameters: {
      type: "object",
      properties: {
        muscleGroups: { type: "array", items: { type: "string", enum: [...MUSCLE_GROUPS] } },
      },
      required: ["muscleGroups"],
      additionalProperties: false,
    },
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
      "Propone un borrador de rutina NUEVA (Routine Draft) para que el usuario lo revise. NO crea nada en la base de datos. Usar exerciseName con nombres reales verificados con searchExercises -- si un ejercicio no existe en el catálogo, el draft será rechazado. Poner addToActivePlan a true solo si el usuario ha pedido explícitamente que la rutina se añada a su plan activo.",
    parameters: ROUTINE_DRAFT_SCHEMA,
    strict: true,
  },
  {
    type: "function",
    name: "propose_action",
    description:
      "Propone uno o varios cambios sobre una rutina o plan YA EXISTENTES (añadir/quitar/sustituir/reordenar un ejercicio, cambiar sus series, o añadir una rutina al plan activo) para que el usuario los revise y confirme. NO escribe nada en la base de datos -- solo produce una propuesta. NUNCA usar para crear una rutina nueva (usar propose_routine_draft para eso). Usar nombres reales tal como los dice el usuario -- el servidor los resuelve contra los datos reales y pedirá aclaración si hay ambigüedad. update_exercise_target SOLO cambia el número de series (targetSets) -- nunca el peso, las repeticiones ni la duración; no lo uses para esos casos, dile al usuario honestamente que ese cambio no está soportado todavía.",
    parameters: PROPOSE_ACTION_SCHEMA,
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
    case "getProgressOverview":
      return toolGetProgressOverview(userId);
    case "getRecentTrainingForMuscleGroup":
      return toolGetRecentTrainingForMuscleGroup(userId, args);
    case "searchExercises":
      return toolSearchExercises(args);
    case "propose_routine_draft":
      return toolProposeRoutineDraft(userId, args as RawRoutineDraft);
    case "propose_action":
      return toolProposeAction(userId, args as RawCoachAction);
    default:
      return ok({ error: `Unknown tool: ${name}` });
  }
}
