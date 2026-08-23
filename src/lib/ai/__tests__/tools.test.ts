import { describe, expect, it, vi } from "vitest";

/**
 * "The engine determines the facts, the LLM interprets them" (brief §9-10)
 * -- these tests check the *tool* layer, which is the boundary between the
 * two: whatever `computeExerciseProgression`/`getProgressSummary` say must
 * come out the other side of `executeCoachTool` unchanged, never
 * re-derived or softened into something the engine didn't actually say.
 */

vi.mock("@/lib/domain/exercises", () => ({
  searchExercises: vi.fn(async (query: string) => {
    if (query.toLowerCase().includes("bench")) {
      return [{ exerciseId: "ex-bench", name: "Barbell Bench Press", primaryMuscles: ["chest"] }];
    }
    return [];
  }),
}));

vi.mock("@/lib/domain/progression", () => ({
  getActivePlanExerciseProgressions: vi.fn(),
  getRoutineExerciseProgressions: vi.fn(),
}));

vi.mock("@/lib/domain/progress", () => ({
  getProgressSummary: vi.fn(),
}));

vi.mock("@/lib/domain/plans", () => ({ getActivePlan: vi.fn(), getPlanItems: vi.fn() }));
vi.mock("@/lib/domain/routines", () => ({ getRoutineDetail: vi.fn(), getUserRoutines: vi.fn() }));
vi.mock("@/lib/domain/history", () => ({ getSessionHistory: vi.fn() }));
vi.mock("@/lib/domain/today", () => ({ getTodayRecommendation: vi.fn() }));

const { executeCoachTool } = await import("../tools");
const { getActivePlanExerciseProgressions } = await import("@/lib/domain/progression");
const { getProgressSummary } = await import("@/lib/domain/progress");
const { getActivePlan } = await import("@/lib/domain/plans");
const { getRoutineDetail, getUserRoutines } = await import("@/lib/domain/routines");

type RawOpOverrides = {
  type?: "add_routine_to_plan" | "add_exercise" | "remove_exercise" | "replace_exercise" | "reorder_exercise" | "update_exercise_target";
  routineName?: string | null;
  exerciseName?: string | null;
  newExerciseName?: string | null;
  targetType?: "reps" | "duration" | null;
  targetSets?: number | null;
  toPosition?: number | null;
};

function rawActionOp(overrides: RawOpOverrides = {}) {
  return {
    type: "remove_exercise" as const,
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
    ...overrides,
  };
}

describe("getExerciseProgression tool", () => {
  it("passes through a 'complete' status from the engine unchanged -- never re-derives it", async () => {
    vi.mocked(getActivePlanExerciseProgressions).mockResolvedValue([
      {
        exerciseId: "ex-bench",
        exerciseName: "Barbell Bench Press",
        routineId: "r1",
        routineName: "Push",
        progression: {
          status: "complete",
          sessionsConsidered: 3,
          last: { targetType: "reps", sets: 4, reps: [8, 8, 8, 8], weightKg: 50 },
          next: { targetType: "reps", sets: 4, reps: [6, 6, 6, 6], weightKg: 52.5 },
          reason: "Completaste el objetivo en las últimas 2 sesiones a 50 KG — sube el peso.",
          decliningTrend: false,
        },
      },
    ]);

    const result = await executeCoachTool("user-1", "getExerciseProgression", JSON.stringify({ exerciseName: "bench press" }));
    const facts = JSON.parse(result.output);

    expect(facts.found).toBe(true);
    expect(facts.inActivePlan).toBe(true);
    expect(facts.occurrences[0].status).toBe("complete");
    expect(facts.occurrences[0].next).toEqual({ targetType: "reps", sets: 4, reps: [6, 6, 6, 6], weightKg: 52.5 });
    // The tool must never fabricate a target the engine didn't produce.
    expect(facts.occurrences[0].next.reps).not.toEqual([7, 7, 7, 7]);
  });

  it("reports insufficient_data honestly instead of inventing a next target", async () => {
    vi.mocked(getActivePlanExerciseProgressions).mockResolvedValue([
      {
        exerciseId: "ex-bench",
        exerciseName: "Barbell Bench Press",
        routineId: "r1",
        routineName: "Push",
        progression: {
          status: "insufficient_data",
          sessionsConsidered: 0,
          last: null,
          next: { targetType: "reps", sets: 4, reps: [6, 6, 6, 6], weightKg: 50 },
          reason: "Sin historial para este ejercicio en esta rutina.",
          decliningTrend: false,
        },
      },
    ]);

    const result = await executeCoachTool("user-1", "getExerciseProgression", JSON.stringify({ exerciseName: "bench press" }));
    const facts = JSON.parse(result.output);

    expect(facts.occurrences[0].status).toBe("insufficient_data");
    expect(facts.occurrences[0].last).toBeNull();
  });

  it("reports a fake exercise as not found -- never invents a match", async () => {
    const result = await executeCoachTool("user-1", "getExerciseProgression", JSON.stringify({ exerciseName: "Quantum Flux Curl" }));
    const facts = JSON.parse(result.output);
    expect(facts.found).toBe(false);
  });
});

describe("getTrainingSummary tool", () => {
  it("reuses getProgressSummary's own numbers verbatim", async () => {
    vi.mocked(getProgressSummary).mockResolvedValue({
      period: "30d",
      hasData: true,
      workoutsCompleted: 6,
      workoutsAbandoned: 1,
      trainingMinutes: 240,
      averageDurationMinutes: 40,
      totalReps: 100,
      totalDurationSeconds: 0,
      totalVolumeKg: 5000,
      activeDays: 6,
      currentStreakDays: 2,
      bestStreakDays: 4,
      sessionsPerWeek: 3.5,
      topExercises: [],
      personalBests: [],
      activityBuckets: null,
    });

    const result = await executeCoachTool("user-1", "getTrainingSummary", "{}");
    const facts = JSON.parse(result.output);
    expect(facts.workoutsCompleted).toBe(6);
    expect(facts.sessionsPerWeek).toBe(3.5);
    expect(facts.currentStreakDays).toBe(2);
  });
});

describe("propose_action tool", () => {
  const PUSH_ROUTINE = { routineId: "r1", name: "Push", sportName: null, exerciseCount: 2 };
  const PUSH_DETAIL = {
    routineId: "r1",
    name: "Push",
    sportName: null,
    exercises: [
      {
        order: 1,
        exerciseId: "ex-dips",
        exerciseName: "Dips",
        targetSets: 3,
        targetType: "reps" as const,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetDurationSeconds: null,
        targetWeightKg: null,
      },
      {
        order: 2,
        exerciseId: "ex-bench",
        exerciseName: "Barbell Bench Press",
        targetSets: 3,
        targetType: "reps" as const,
        targetRepsMin: 6,
        targetRepsMax: 8,
        targetDurationSeconds: null,
        targetWeightKg: 60,
      },
    ],
  };

  it("accepts a single-op batch and surfaces it as a side effect, never writing anything", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH_ROUTINE]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await executeCoachTool(
      "user-1",
      "propose_action",
      JSON.stringify({ summary: "Quitar Dips de Push", ops: [rawActionOp({ type: "remove_exercise", routineName: "Push", exerciseName: "Dips" })] }),
    );

    expect(result.sideEffect?.type).toBe("action_draft");
    const facts = JSON.parse(result.output);
    expect(facts.accepted).toBe(true);
    expect(facts.draft.destructive).toBe(true);
    expect(facts.draft.ops[0].exerciseId).toBe("ex-dips");
  });

  it("accepts a multi-op batch as one draft, not several", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH_ROUTINE]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await executeCoachTool(
      "user-1",
      "propose_action",
      JSON.stringify({
        summary: "Quitar Dips y poner Bench Press primero",
        ops: [
          rawActionOp({ type: "remove_exercise", routineName: "Push", exerciseName: "Dips" }),
          rawActionOp({ type: "reorder_exercise", routineName: "Push", exerciseName: "Barbell Bench Press", toPosition: 1 }),
        ],
      }),
    );

    const facts = JSON.parse(result.output);
    expect(facts.accepted).toBe(true);
    expect(facts.draft.ops).toHaveLength(2);
  });

  it("never produces a side effect when a name is ambiguous -- only a fact for the model to ask about", async () => {
    // Neither "Push A" nor "Push B" exactly matches the query "Push".
    vi.mocked(getUserRoutines).mockResolvedValue([
      { routineId: "r1", name: "Push A", sportName: null, exerciseCount: 2 },
      { routineId: "r2", name: "Push B", sportName: null, exerciseCount: 1 },
    ]);

    const result = await executeCoachTool(
      "user-1",
      "propose_action",
      JSON.stringify({ summary: "Quitar Dips de Push", ops: [rawActionOp({ type: "remove_exercise", routineName: "Push", exerciseName: "Dips" })] }),
    );

    expect(result.sideEffect).toBeUndefined();
    const facts = JSON.parse(result.output);
    expect(facts.resolved).toBe(false);
    expect(facts.reason).toMatch(/Push/);
  });

  it("rejects with a reason and surfaces action_rejected when the routine doesn't exist", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([]);

    const result = await executeCoachTool(
      "user-1",
      "propose_action",
      JSON.stringify({ summary: "Quitar Dips de Piernas", ops: [rawActionOp({ type: "remove_exercise", routineName: "Piernas", exerciseName: "Dips" })] }),
    );

    expect(result.sideEffect?.type).toBe("action_rejected");
    const facts = JSON.parse(result.output);
    expect(facts.accepted).toBe(false);
  });
});

describe("propose_routine_draft tool with addToActivePlan", () => {
  it("resolves the real active plan name server-side, never trusting a plan identity from the model", async () => {
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Rotación Fuerza 4 Días" });

    const result = await executeCoachTool(
      "user-1",
      "propose_routine_draft",
      JSON.stringify({
        name: "Core rápido",
        description: null,
        addToActivePlan: true,
        exercises: [
          {
            exerciseName: "Barbell Bench Press",
            order: 1,
            sets: 3,
            targetType: "reps",
            targetRepsMin: 6,
            targetRepsMax: 8,
            targetDurationSeconds: null,
            targetWeightKg: null,
            restSeconds: null,
          },
        ],
      }),
    );

    const facts = JSON.parse(result.output);
    expect(facts.draft.activePlanName).toBe("Rotación Fuerza 4 Días");
  });

  it("leaves activePlanName null when addToActivePlan is false", async () => {
    const result = await executeCoachTool(
      "user-1",
      "propose_routine_draft",
      JSON.stringify({
        name: "Core rápido",
        description: null,
        addToActivePlan: false,
        exercises: [
          {
            exerciseName: "Barbell Bench Press",
            order: 1,
            sets: 3,
            targetType: "reps",
            targetRepsMin: 6,
            targetRepsMax: 8,
            targetDurationSeconds: null,
            targetWeightKg: null,
            restSeconds: null,
          },
        ],
      }),
    );

    const facts = JSON.parse(result.output);
    expect(facts.draft.activePlanName).toBeNull();
  });
});
