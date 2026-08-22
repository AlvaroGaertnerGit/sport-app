import { describe, expect, it, vi } from "vitest";

import type { ExerciseSearchResult } from "@/lib/domain/types";

const CATALOG: ExerciseSearchResult[] = [
  { exerciseId: "ex-bench", name: "Barbell Bench Press", primaryMuscles: ["chest"] },
  { exerciseId: "ex-incline", name: "Incline Dumbbell Press", primaryMuscles: ["chest"] },
  { exerciseId: "ex-plank", name: "Plank", primaryMuscles: ["core"] },
];

vi.mock("@/lib/domain/exercises", () => ({
  searchExercises: vi.fn(async (query: string) => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((e) => e.name.toLowerCase().includes(q));
  }),
}));

const { resolveExerciseByName, resolveRoutineDraft, validateRoutineDraft } = await import("../routine-draft");
const { searchExercises } = await import("@/lib/domain/exercises");

function draftExercise(overrides: Partial<Parameters<typeof validateRoutineDraft>[0]["exercises"][number]> = {}) {
  return {
    exerciseId: "ex-bench",
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

describe("resolveExerciseByName", () => {
  it("resolves a real catalog exercise by name -- searchExercises('bench') -> real result", async () => {
    const result = await resolveExerciseByName("Barbell Bench Press");
    expect(result).toEqual({ exerciseId: "ex-bench", name: "Barbell Bench Press" });
  });

  it("resolves a fuzzy but real match", async () => {
    const result = await resolveExerciseByName("bench press");
    expect(result?.exerciseId).toBe("ex-bench");
  });

  it("does not invent an exerciseId for a fake exercise", async () => {
    const result = await resolveExerciseByName("Quantum Flux Curl");
    expect(result).toBeNull();
  });
});

describe("resolveRoutineDraft", () => {
  it("resolves every exercise against the real catalog (never a second catalog)", async () => {
    const raw = {
      name: "Push",
      description: null,
      exercises: [
        {
          exerciseName: "Barbell Bench Press",
          order: 1,
          sets: 3,
          targetType: "reps" as const,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetDurationSeconds: null,
          targetWeightKg: 50,
          restSeconds: 90,
        },
      ],
    };
    const { draft, unresolvedNames } = await resolveRoutineDraft(raw);
    expect(unresolvedNames).toEqual([]);
    expect(draft?.exercises[0].exerciseId).toBe("ex-bench");
    expect(searchExercises).toHaveBeenCalledWith("Barbell Bench Press", []);
  });

  it("rejects a fake exercise instead of inventing an exerciseId", async () => {
    const raw = {
      name: "Push",
      description: null,
      exercises: [
        {
          exerciseName: "Quantum Flux Curl",
          order: 1,
          sets: 3,
          targetType: "reps" as const,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetDurationSeconds: null,
          targetWeightKg: null,
          restSeconds: null,
        },
      ],
    };
    const { draft, unresolvedNames } = await resolveRoutineDraft(raw);
    expect(draft).toBeNull();
    expect(unresolvedNames).toEqual(["Quantum Flux Curl"]);
  });
});

describe("validateRoutineDraft", () => {
  it("accepts a well-formed draft", () => {
    const result = validateRoutineDraft({ name: "Push", description: null, exercises: [draftExercise()] });
    expect(result.valid).toBe(true);
  });

  it("rejects an empty routine", () => {
    const result = validateRoutineDraft({ name: "Push", description: null, exercises: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toMatch(/ejercicios/i);
  });

  it("rejects sets = 0", () => {
    const result = validateRoutineDraft({ name: "Push", description: null, exercises: [draftExercise({ sets: 0 })] });
    expect(result.valid).toBe(false);
  });

  it("rejects a duration exercise with no duration", () => {
    const result = validateRoutineDraft({
      name: "Core",
      description: null,
      exercises: [
        draftExercise({
          exerciseId: "ex-plank",
          exerciseName: "Plank",
          targetType: "duration",
          targetRepsMin: null,
          targetRepsMax: null,
          targetDurationSeconds: null,
        }),
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects repsMax below repsMin", () => {
    const result = validateRoutineDraft({
      name: "Push",
      description: null,
      exercises: [draftExercise({ targetRepsMin: 10, targetRepsMax: 5 })],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a duplicate order", () => {
    const result = validateRoutineDraft({
      name: "Push",
      description: null,
      exercises: [draftExercise({ order: 1 }), draftExercise({ exerciseId: "ex-incline", order: 1 })],
    });
    expect(result.valid).toBe(false);
  });
});
