import { describe, expect, it, vi } from "vitest";

import type { ExerciseSearchResult, RoutineSummary } from "@/lib/domain/types";

/**
 * `resolvePlanDraft` is the create-a-new-plan twin of `resolveRoutineDraft`
 * (routine-draft.test.ts) -- these tests mirror that file's own shape:
 * exact/fuzzy/unresolved resolution, then validation, for a draft that can
 * mix existing routines and brand-new ones.
 */

const CATALOG: ExerciseSearchResult[] = [
  { exerciseId: "ex-bench", name: "Barbell Bench Press", primaryMuscles: ["chest"] },
  { exerciseId: "ex-plank", name: "Plank", primaryMuscles: ["core"] },
];

const ROUTINES: RoutineSummary[] = [
  { routineId: "r1", name: "Push", sportName: null, exerciseCount: 3 },
  { routineId: "r2", name: "Pull", sportName: null, exerciseCount: 3 },
];

vi.mock("@/lib/domain/exercises", () => ({
  searchExercises: vi.fn(async (query: string) => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((e) => e.name.toLowerCase().includes(q));
  }),
}));
vi.mock("@/lib/domain/routines", () => ({ getUserRoutines: vi.fn() }));

const { resolvePlanDraft, resolveExistingRoutineByName, validatePlanDraft } = await import("../plan-draft");
const { getUserRoutines } = await import("@/lib/domain/routines");

function rawRoutineRef(overrides: Partial<Parameters<typeof resolvePlanDraft>[1]["routines"][number]> = {}) {
  return {
    isNew: false,
    existingRoutineName: null,
    newRoutineName: null,
    newRoutineExercises: [],
    ...overrides,
  };
}

function newRoutineExercise(overrides: Partial<ReturnType<typeof rawRoutineRef>["newRoutineExercises"][number]> = {}) {
  return {
    exerciseName: "Barbell Bench Press",
    order: 1,
    sets: 3,
    targetType: "reps" as const,
    targetRepsMin: 6,
    targetRepsMax: 8,
    targetDurationSeconds: null,
    targetWeightKg: null,
    restSeconds: null,
    ...overrides,
  };
}

describe("resolveExistingRoutineByName", () => {
  it("resolves an exact routine name", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);
    const result = await resolveExistingRoutineByName("u1", "Push");
    expect(result).toEqual({ routineId: "r1", name: "Push" });
  });

  it("does not invent a routineId for a fake routine", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);
    const result = await resolveExistingRoutineByName("u1", "Legs");
    expect(result).toBeNull();
  });
});

describe("resolvePlanDraft", () => {
  it("resolves a plan made entirely of existing routines", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);

    const { draft, unresolvedRoutineNames, unresolvedExerciseNames } = await resolvePlanDraft("u1", {
      name: "Fuerza 2 días",
      activateOnCreate: false,
      routines: [rawRoutineRef({ existingRoutineName: "Push" }), rawRoutineRef({ existingRoutineName: "Pull" })],
    });

    expect(unresolvedRoutineNames).toEqual([]);
    expect(unresolvedExerciseNames).toEqual([]);
    expect(draft?.routines).toHaveLength(2);
    expect(draft?.routines[0]).toEqual({ kind: "existing", routineId: "r1", routineName: "Push" });
  });

  it("resolves a plan that creates a brand-new routine alongside existing ones", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);

    const { draft, unresolvedRoutineNames, unresolvedExerciseNames } = await resolvePlanDraft("u1", {
      name: "Mixto",
      activateOnCreate: false,
      routines: [
        rawRoutineRef({ existingRoutineName: "Push" }),
        rawRoutineRef({ isNew: true, newRoutineName: "Core", newRoutineExercises: [newRoutineExercise({ exerciseName: "Plank", targetType: "duration", targetRepsMin: null, targetRepsMax: null, targetDurationSeconds: 30 })] }),
      ],
    });

    expect(unresolvedRoutineNames).toEqual([]);
    expect(unresolvedExerciseNames).toEqual([]);
    expect(draft?.routines[0]).toEqual({ kind: "existing", routineId: "r1", routineName: "Push" });
    expect(draft?.routines[1]).toMatchObject({ kind: "new", name: "Core" });
    if (draft?.routines[1].kind === "new") {
      expect(draft.routines[1].exercises[0].exerciseId).toBe("ex-plank");
    }
  });

  it("rejects an existing-routine reference that doesn't resolve, never inventing an id", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);

    const { draft, unresolvedRoutineNames } = await resolvePlanDraft("u1", {
      name: "Fuerza",
      activateOnCreate: false,
      routines: [rawRoutineRef({ existingRoutineName: "Legs" })],
    });

    expect(draft).toBeNull();
    expect(unresolvedRoutineNames).toEqual(["Legs"]);
  });

  it("rejects a new-routine exercise that doesn't exist in the catalog", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue(ROUTINES);

    const { draft, unresolvedExerciseNames } = await resolvePlanDraft("u1", {
      name: "Fuerza",
      activateOnCreate: false,
      routines: [rawRoutineRef({ isNew: true, newRoutineName: "Nueva", newRoutineExercises: [newRoutineExercise({ exerciseName: "Quantum Flux Curl" })] })],
    });

    expect(draft).toBeNull();
    expect(unresolvedExerciseNames).toEqual(["Quantum Flux Curl"]);
  });
});

describe("validatePlanDraft", () => {
  it("accepts a well-formed plan", () => {
    const result = validatePlanDraft({
      name: "Fuerza",
      activateOnCreate: false,
      routines: [{ kind: "existing", routineId: "r1", routineName: "Push" }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a plan with no routines", () => {
    const result = validatePlanDraft({ name: "Fuerza", activateOnCreate: false, routines: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toMatch(/rutinas/i);
  });

  it("rejects a plan with no name", () => {
    const result = validatePlanDraft({
      name: "  ",
      activateOnCreate: false,
      routines: [{ kind: "existing", routineId: "r1", routineName: "Push" }],
    });
    expect(result.valid).toBe(false);
  });

  it("reuses validateRoutineDraft's own checks for a new routine's exercises", () => {
    const result = validatePlanDraft({
      name: "Fuerza",
      activateOnCreate: false,
      routines: [
        {
          kind: "new",
          name: "Core",
          exercises: [
            {
              exerciseId: "ex-plank",
              exerciseName: "Plank",
              order: 1,
              sets: 0, // invalid -- must be > 0
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
    });
    expect(result.valid).toBe(false);
  });
});
