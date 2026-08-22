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
vi.mock("@/lib/domain/routines", () => ({ getRoutineDetail: vi.fn() }));
vi.mock("@/lib/domain/history", () => ({ getSessionHistory: vi.fn() }));
vi.mock("@/lib/domain/today", () => ({ getTodayRecommendation: vi.fn() }));

const { executeCoachTool } = await import("../tools");
const { getActivePlanExerciseProgressions } = await import("@/lib/domain/progression");
const { getProgressSummary } = await import("@/lib/domain/progress");

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
