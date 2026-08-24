import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/domain/plans", () => ({ getActivePlan: vi.fn(), getPlanItems: vi.fn(), getUserPlans: vi.fn() }));
vi.mock("@/lib/domain/routines", () => ({ getRoutineDetail: vi.fn(), getRoutineExerciseNames: vi.fn(), getUserRoutines: vi.fn() }));
vi.mock("@/lib/domain/history", () => ({ getSessionHistory: vi.fn(), getRecentSessionsForMuscleGroups: vi.fn() }));
vi.mock("@/lib/domain/today", () => ({ getTodayRecommendation: vi.fn() }));
vi.mock("@/lib/domain/coach", () => ({ getCoachSummary: vi.fn() }));

const { executeCoachTool } = await import("../tools");
const { getActivePlanExerciseProgressions } = await import("@/lib/domain/progression");
const { getProgressSummary } = await import("@/lib/domain/progress");
const { getActivePlan, getPlanItems, getUserPlans } = await import("@/lib/domain/plans");
const { getRoutineDetail, getRoutineExerciseNames, getUserRoutines } = await import("@/lib/domain/routines");
const { getRecentSessionsForMuscleGroups } = await import("@/lib/domain/history");
const { getCoachSummary } = await import("@/lib/domain/coach");
const { getTodayRecommendation } = await import("@/lib/domain/today");
const { getRoutineExerciseProgressions } = await import("@/lib/domain/progression");

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

describe("getCurrentPlan tool", () => {
  beforeEach(() => {
    vi.mocked(getActivePlan).mockClear();
    vi.mocked(getPlanItems).mockClear();
    vi.mocked(getRoutineExerciseNames).mockClear();
    vi.mocked(getRoutineDetail).mockClear();
  });

  it("fetches every distinct routine's exercise names in a single getRoutineExerciseNames call -- never getRoutineDetail per plan item", async () => {
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Rotación 4 Días" });
    vi.mocked(getPlanItems).mockResolvedValue([
      { planItemId: "pi1", routineId: "r-espalda", routineName: "Espalda", order: 1 },
      { planItemId: "pi2", routineId: "r-pecho", routineName: "Pecho", order: 2 },
      { planItemId: "pi3", routineId: "r-piernas", routineName: "Piernas", order: 3 },
      { planItemId: "pi4", routineId: "r-piernas", routineName: "Piernas", order: 4 }, // repeated routine
    ]);
    vi.mocked(getRoutineExerciseNames).mockResolvedValue(
      new Map([
        ["r-espalda", [{ order: 1, exerciseName: "Pull Up" }, { order: 2, exerciseName: "Row" }]],
        ["r-pecho", [{ order: 1, exerciseName: "Bench Press" }]],
        ["r-piernas", [{ order: 1, exerciseName: "Squat" }]],
      ]),
    );

    const result = await executeCoachTool("user-1", "getCurrentPlan", "{}");
    const facts = JSON.parse(result.output);

    // Called once, with every distinct routine id -- the repeated "Piernas" routine only counted once in the request.
    expect(getRoutineExerciseNames).toHaveBeenCalledTimes(1);
    expect(getRoutineExerciseNames).toHaveBeenCalledWith("user-1", ["r-espalda", "r-pecho", "r-piernas"]);
    expect(getRoutineDetail).not.toHaveBeenCalled();

    expect(facts.routines).toHaveLength(4);
    expect(facts.routines[0].exerciseNames).toEqual(["Pull Up", "Row"]);
    expect(facts.routines[2].exerciseNames).toEqual(["Squat"]);
    // The repeated routine (order 3 and 4) resolves to the same real exercises both times -- never dropped, never invented.
    expect(facts.routines[3].exerciseNames).toEqual(["Squat"]);
  });

  it("reports no active plan honestly without calling getPlanItems or getRoutineExerciseNames", async () => {
    vi.mocked(getActivePlan).mockResolvedValue(null);

    const result = await executeCoachTool("user-1", "getCurrentPlan", "{}");
    const facts = JSON.parse(result.output);

    expect(facts.hasActivePlan).toBe(false);
    expect(getPlanItems).not.toHaveBeenCalled();
    expect(getRoutineExerciseNames).not.toHaveBeenCalled();
  });
});

describe("getUserPlans tool", () => {
  it("passes through every plan's summary verbatim, active and paused alike", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([
      { planId: "p1", name: "Fuerza", status: "active", routineCount: 2, routineNames: ["Push", "Pull"], sportName: null },
      { planId: "p2", name: "Calistenia", status: "paused", routineCount: 1, routineNames: ["Tirón"], sportName: null },
    ]);

    const result = await executeCoachTool("user-1", "getUserPlans", "{}");
    const facts = JSON.parse(result.output);

    expect(facts).toHaveLength(2);
    expect(facts[0]).toEqual({ name: "Fuerza", status: "active", routineCount: 2, routineNames: ["Push", "Pull"], sportName: null });
    expect(facts[1].status).toBe("paused");
  });
});

describe("getPlanDetails tool", () => {
  it("resolves a named plan (not necessarily active) and reports its routines with exercise names", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([
      { planId: "p2", name: "Calistenia", status: "paused", routineCount: 1, routineNames: ["Tirón"], sportName: null },
    ]);
    vi.mocked(getPlanItems).mockResolvedValue([{ planItemId: "pi1", routineId: "r-tiron", routineName: "Tirón", order: 1 }]);
    vi.mocked(getRoutineExerciseNames).mockResolvedValue(new Map([["r-tiron", [{ order: 1, exerciseName: "Pull Up" }]]]));

    const result = await executeCoachTool("user-1", "getPlanDetails", JSON.stringify({ planName: "Calistenia" }));
    const facts = JSON.parse(result.output);

    expect(facts.found).toBe(true);
    expect(facts.status).toBe("paused");
    expect(facts.routines[0].exerciseNames).toEqual(["Pull Up"]);
  });

  it("reports found:false honestly when no plan matches, never guessing", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([]);

    const result = await executeCoachTool("user-1", "getPlanDetails", JSON.stringify({ planName: "Inexistente" }));
    const facts = JSON.parse(result.output);

    expect(facts.found).toBe(false);
  });
});

describe("propose_plan_draft tool", () => {
  it("resolves a plan mixing an existing routine and a brand-new one into a single draft", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([{ routineId: "r1", name: "Push", sportName: null, exerciseCount: 3 }]);

    const result = await executeCoachTool(
      "user-1",
      "propose_plan_draft",
      JSON.stringify({
        name: "Fuerza mixta",
        activateOnCreate: false,
        routines: [
          { isNew: false, existingRoutineName: "Push", newRoutineName: null, newRoutineExercises: [] },
          {
            isNew: true,
            existingRoutineName: null,
            newRoutineName: "Core",
            newRoutineExercises: [
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
          },
        ],
      }),
    );

    expect(result.sideEffect?.type).toBe("plan_draft");
    const facts = JSON.parse(result.output);
    expect(facts.accepted).toBe(true);
    expect(facts.draft.routines).toHaveLength(2);
    expect(facts.draft.routines[0]).toEqual({ kind: "existing", routineId: "r1", routineName: "Push" });
  });

  it("rejects with plan_draft_rejected when a referenced existing routine doesn't exist", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([]);

    const result = await executeCoachTool(
      "user-1",
      "propose_plan_draft",
      JSON.stringify({
        name: "Fuerza",
        activateOnCreate: false,
        routines: [{ isNew: false, existingRoutineName: "Legs", newRoutineName: null, newRoutineExercises: [] }],
      }),
    );

    expect(result.sideEffect?.type).toBe("plan_draft_rejected");
    const facts = JSON.parse(result.output);
    expect(facts.accepted).toBe(false);
  });
});

describe("getTodayWorkout tool", () => {
  it("exposes progressionStatus/progressionReason so 'maintain' and 'insufficient_data' are never indistinguishable, even when recommendedNext is the same value either way", async () => {
    vi.mocked(getTodayRecommendation).mockResolvedValue({
      type: "ready",
      planId: "p1",
      planItemId: "pi1",
      routineId: "r1",
      routineName: "Empuje",
    });
    vi.mocked(getRoutineDetail).mockResolvedValue({
      routineId: "r1",
      name: "Empuje",
      sportName: null,
      exercises: [
        {
          order: 1,
          exerciseId: "ex-maintain",
          exerciseName: "Cable Overhead Extension",
          targetSets: 3,
          targetType: "reps",
          targetRepsMin: 10,
          targetRepsMax: 12,
          targetDurationSeconds: null,
          targetWeightKg: 25,
        },
        {
          order: 2,
          exerciseId: "ex-insufficient",
          exerciseName: "Standing Cable Chest Press",
          targetSets: 4,
          targetType: "reps",
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetDurationSeconds: null,
          targetWeightKg: 30,
        },
      ],
    });
    const sameTarget = { targetType: "reps" as const, sets: 3, reps: [10, 10, 10], weightKg: 25 };
    vi.mocked(getRoutineExerciseProgressions).mockResolvedValue(
      new Map([
        [
          "ex-maintain",
          { status: "maintain" as const, sessionsConsidered: 3, last: sameTarget, next: sameTarget, reason: "La última sesión no completó las 3 series objetivo.", decliningTrend: false },
        ],
        [
          "ex-insufficient",
          { status: "insufficient_data" as const, sessionsConsidered: 1, last: sameTarget, next: sameTarget, reason: "Solo hay una sesión registrada. Necesitamos más datos para proponer un cambio.", decliningTrend: false },
        ],
      ]),
    );

    const result = await executeCoachTool("user-1", "getTodayWorkout", "{}");
    const facts = JSON.parse(result.output);

    const maintainExercise = facts.exercises.find((e: { exerciseName: string }) => e.exerciseName === "Cable Overhead Extension");
    const insufficientExercise = facts.exercises.find((e: { exerciseName: string }) => e.exerciseName === "Standing Cable Chest Press");

    expect(maintainExercise.progressionStatus).toBe("maintain");
    expect(insufficientExercise.progressionStatus).toBe("insufficient_data");
    expect(insufficientExercise.progressionReason).toMatch(/Solo hay una sesión/);
    // Both happen to recommend the same next target -- the status/reason fields are the only way to tell them apart.
    expect(maintainExercise.recommendedNext).toEqual(insufficientExercise.recommendedNext);
  });
});

describe("getProgressOverview tool", () => {
  it("passes through getCoachSummary's improving/maintaining/insufficientData verbatim -- the same read the Coach page header uses", async () => {
    vi.mocked(getCoachSummary).mockResolvedValue({
      hasData: true,
      workoutsCompleted: 6,
      sessionsPerWeek: 3.5,
      currentStreakDays: 2,
      improving: [{ exerciseId: "ex-bench", exerciseName: "Barbell Bench Press", routineName: "Push", delta: "+2 REPS" }],
      maintaining: [{ exerciseId: "ex-dips", exerciseName: "Dips", routineName: "Push", nextTarget: "3 x 10" }],
      insufficientData: [{ exerciseId: "ex-fly", exerciseName: "Cable Fly", routineName: "Push" }],
    });

    const result = await executeCoachTool("user-1", "getProgressOverview", "{}");
    const facts = JSON.parse(result.output);

    expect(facts.improving).toEqual([{ exerciseId: "ex-bench", exerciseName: "Barbell Bench Press", routineName: "Push", delta: "+2 REPS" }]);
    expect(facts.maintaining[0].nextTarget).toBe("3 x 10");
    expect(facts.insufficientData[0].exerciseName).toBe("Cable Fly");
  });

  it("never fabricates an improving exercise when the engine says none is improving", async () => {
    vi.mocked(getCoachSummary).mockResolvedValue({
      hasData: true,
      workoutsCompleted: 2,
      sessionsPerWeek: null,
      currentStreakDays: 0,
      improving: [],
      maintaining: [],
      insufficientData: [{ exerciseId: "ex-fly", exerciseName: "Cable Fly", routineName: "Push" }],
    });

    const result = await executeCoachTool("user-1", "getProgressOverview", "{}");
    const facts = JSON.parse(result.output);

    expect(facts.improving).toEqual([]);
  });
});

describe("getRecentTrainingForMuscleGroup tool", () => {
  beforeEach(() => {
    vi.mocked(getRecentSessionsForMuscleGroups).mockClear();
  });

  it("resolves the requested muscle groups and passes through the domain read's sessions verbatim", async () => {
    vi.mocked(getRecentSessionsForMuscleGroups).mockResolvedValue([
      {
        sessionId: "s1",
        routineName: "Pull",
        status: "completed",
        startedAt: "2026-08-20T10:00:00.000Z",
        matchedExerciseNames: ["Wide-Grip Lat Pulldown"],
      },
    ]);

    const result = await executeCoachTool("user-1", "getRecentTrainingForMuscleGroup", JSON.stringify({ muscleGroups: ["back", "lats"] }));
    const facts = JSON.parse(result.output);

    expect(getRecentSessionsForMuscleGroups).toHaveBeenCalledWith("user-1", ["back", "lats"], expect.any(Number));
    expect(facts.found).toBe(true);
    expect(facts.sessions[0].matchedExerciseNames).toEqual(["Wide-Grip Lat Pulldown"]);
  });

  it("drops any muscle group value that isn't a real taxonomy value -- never trusts the model's raw input", async () => {
    vi.mocked(getRecentSessionsForMuscleGroups).mockResolvedValue([]);

    await executeCoachTool("user-1", "getRecentTrainingForMuscleGroup", JSON.stringify({ muscleGroups: ["back", "espalda"] }));

    expect(getRecentSessionsForMuscleGroups).toHaveBeenCalledWith("user-1", ["back"], expect.any(Number));
  });

  it("reports found:false without calling the domain read when every requested value is invalid", async () => {
    const result = await executeCoachTool("user-1", "getRecentTrainingForMuscleGroup", JSON.stringify({ muscleGroups: ["espalda"] }));
    const facts = JSON.parse(result.output);

    expect(facts.found).toBe(false);
    expect(getRecentSessionsForMuscleGroups).not.toHaveBeenCalled();
  });

  it("returns an empty session list honestly when nothing matched -- never invents a session", async () => {
    vi.mocked(getRecentSessionsForMuscleGroups).mockResolvedValue([]);

    const result = await executeCoachTool("user-1", "getRecentTrainingForMuscleGroup", JSON.stringify({ muscleGroups: ["chest"] }));
    const facts = JSON.parse(result.output);

    expect(facts.found).toBe(true);
    expect(facts.sessions).toEqual([]);
  });
});
