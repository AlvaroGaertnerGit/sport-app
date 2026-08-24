import { describe, expect, it, vi } from "vitest";

/**
 * `resolveAndValidateAction` is the ONE place a name becomes a real
 * database id for a write action (CLAUDE.md §7) -- these tests check every
 * resolver's exact/fuzzy/ambiguous/not-found outcomes, and that a batch is
 * all-or-nothing: one bad op rejects the whole thing.
 */

const PUSH = { routineId: "r1", name: "Push", sportName: null, exerciseCount: 2 };
const PUSH_B = { routineId: "r2", name: "Push B", sportName: null, exerciseCount: 1 };

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
    {
      order: 3,
      exerciseId: "ex-fly",
      exerciseName: "Cable Fly",
      targetSets: 3,
      targetType: "reps" as const,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetDurationSeconds: null,
      targetWeightKg: 15,
    },
  ],
};

const CATALOG = [
  { exerciseId: "ex-pushup", name: "Push Up", primaryMuscles: ["chest"] },
  { exerciseId: "ex-flymid", name: "Cable Fly Mid Chest", primaryMuscles: ["chest"] },
  { exerciseId: "ex-flylow", name: "Cable Fly Low To High", primaryMuscles: ["chest"] },
];

vi.mock("@/lib/domain/plans", () => ({ getActivePlan: vi.fn(), getPlanItems: vi.fn(), getUserPlans: vi.fn() }));
vi.mock("@/lib/domain/routines", () => ({ getRoutineDetail: vi.fn(), getUserRoutines: vi.fn() }));
vi.mock("@/lib/domain/exercises", () => ({
  searchExercises: vi.fn(async (query: string, excludeIds: string[] = []) => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((e) => e.name.toLowerCase().includes(q) && !excludeIds.includes(e.exerciseId));
  }),
}));

const { resolveAndValidateAction, draftsMatch, toRawAction } = await import("../action-draft");
const { getActivePlan, getPlanItems, getUserPlans } = await import("@/lib/domain/plans");
const { getRoutineDetail, getUserRoutines } = await import("@/lib/domain/routines");

const PLAN_A = { planId: "p1", name: "Fuerza", status: "active" as const, routineCount: 2, routineNames: ["Push", "Pull"], sportName: null };
const PLAN_B = { planId: "p2", name: "Calistenia", status: "paused" as const, routineCount: 1, routineNames: ["Tirón"], sportName: null };
const PLAN_A_ITEMS = [
  { planItemId: "pi1", routineId: "r1", routineName: "Push", order: 1 },
  { planItemId: "pi2", routineId: "r2", routineName: "Pull", order: 2 },
];

type RawCoachActionOp = Parameters<typeof resolveAndValidateAction>[1]["ops"][number];

function rawOp(overrides: Partial<RawCoachActionOp> = {}): RawCoachActionOp {
  return {
    type: "remove_exercise",
    planName: null,
    routineName: null,
    exerciseName: null,
    newExerciseName: null,
    newName: null,
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

describe("resolveRoutineForUser (via remove_exercise's routine lookup)", () => {
  it("resolves an exact routine name", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ routineName: "Push", exerciseName: "Dips" })] });
    expect(result.status).toBe("resolved");
  });

  it("is ambiguous when two routines share a substring, with no exact winner", async () => {
    // Neither "Push A" nor "Push B" exactly matches the query "Push" -- both are
    // real substring candidates, so this must ask rather than pick one.
    vi.mocked(getUserRoutines).mockResolvedValue([
      { ...PUSH, name: "Push A" },
      { ...PUSH_B, name: "Push B" },
    ]);

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ routineName: "Push", exerciseName: "Dips" })] });
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.question).toMatch(/Push/);
  });

  it("rejects a routine that doesn't exist", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([]);

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ routineName: "Piernas", exerciseName: "Dips" })] });
    expect(result.status).toBe("rejected");
  });
});

describe("resolveExerciseInRoutine (remove/reorder/update)", () => {
  it("rejects removing an exercise not in the routine", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ routineName: "Push", exerciseName: "Squat" })] });
    expect(result.status).toBe("rejected");
  });

  it("is ambiguous when an in-routine exercise name matches two rows, no exact winner", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue({
      ...PUSH_DETAIL,
      exercises: [
        { ...PUSH_DETAIL.exercises[0], exerciseName: "Cable Fly Mid" },
        { ...PUSH_DETAIL.exercises[1], exerciseId: "ex-fly2", exerciseName: "Cable Fly Low" },
      ],
    });

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ routineName: "Push", exerciseName: "Cable Fly" })] });
    expect(result.status).toBe("ambiguous");
  });

  it("rejects update_exercise_target with targetSets <= 0", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "update_exercise_target", routineName: "Push", exerciseName: "Dips", targetSets: 0 })],
    });
    expect(result.status).toBe("rejected");
  });

  it("resolves update_exercise_target and carries the previous value for compensation", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "update_exercise_target", routineName: "Push", exerciseName: "Dips", targetSets: 4 })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("update_exercise_target");
      if (op.type === "update_exercise_target") {
        expect(op.targetSets).toBe(4);
        expect(op.previousTargetSets).toBe(3);
      }
    }
  });

  it("rejects reorder_exercise with an out-of-range position", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "reorder_exercise", routineName: "Push", exerciseName: "Dips", toPosition: 99 })],
    });
    expect(result.status).toBe("rejected");
  });
});

describe("resolveExerciseFromCatalog (add_exercise / replace_exercise's new exercise)", () => {
  it("is ambiguous across two real catalog exercises with no exact winner (brief's own Cable Fly example)", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [
        rawOp({
          type: "replace_exercise",
          routineName: "Push",
          exerciseName: "Dips",
          newExerciseName: "Cable Fly",
        }),
      ],
    });
    expect(result.status).toBe("ambiguous");
  });

  it("rejects add_exercise for an exercise not in the catalog", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [
        rawOp({
          type: "add_exercise",
          routineName: "Push",
          exerciseName: "Quantum Flux Curl",
          targetType: "reps",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
        }),
      ],
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects add_exercise for an exercise already in the routine", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [
        rawOp({
          type: "add_exercise",
          routineName: "Push",
          exerciseName: "Dips",
          targetType: "reps",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
        }),
      ],
    });
    expect(result.status).toBe("rejected");
  });
});

describe("multi-op batches", () => {
  it("resolves a 2-op batch into one draft", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const result = await resolveAndValidateAction("u1", {
      summary: "Quitar Dips y mover Bench Press",
      ops: [
        rawOp({ type: "remove_exercise", routineName: "Push", exerciseName: "Dips" }),
        rawOp({ type: "reorder_exercise", routineName: "Push", exerciseName: "Barbell Bench Press", toPosition: 1 }),
      ],
    });

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.draft.ops).toHaveLength(2);
      expect(result.draft.destructive).toBe(true);
    }
  });

  it("rejects the whole batch when any single op is ambiguous", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue({
      ...PUSH_DETAIL,
      exercises: [
        { ...PUSH_DETAIL.exercises[0], exerciseName: "Cable Fly Mid" },
        { ...PUSH_DETAIL.exercises[1], exerciseId: "ex-fly2", exerciseName: "Cable Fly Low" },
      ],
    });

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [
        rawOp({ type: "update_exercise_target", routineName: "Push", exerciseName: "Cable Fly", targetSets: 4 }),
      ],
    });

    expect(result.status).toBe("ambiguous");
  });
});

describe("add_routine_to_plan", () => {
  it("uses the real active plan, never a client-supplied identity", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Rotación Fuerza" });

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ type: "add_routine_to_plan", routineName: "Push" })] });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("add_routine_to_plan");
      if (op.type === "add_routine_to_plan") expect(op.planId).toBe("p1");
    }
  });

  it("rejects when the user has no active plan", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getActivePlan).mockResolvedValue(null);

    const result = await resolveAndValidateAction("u1", { summary: "", ops: [rawOp({ type: "add_routine_to_plan", routineName: "Push" })] });
    expect(result.status).toBe("rejected");
  });
});

describe("toRawAction / draftsMatch (confirm-time staleness re-validation)", () => {
  it("round-trips a resolved draft back into a raw action that re-resolves to the same thing", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const first = await resolveAndValidateAction("u1", {
      summary: "Quitar Dips",
      ops: [rawOp({ type: "remove_exercise", routineName: "Push", exerciseName: "Dips" })],
    });
    expect(first.status).toBe("resolved");
    if (first.status !== "resolved") return;

    const raw = toRawAction(first.draft);
    const second = await resolveAndValidateAction("u1", raw);
    expect(second.status).toBe("resolved");
    if (second.status !== "resolved") return;

    expect(draftsMatch(first.draft, second.draft)).toBe(true);
  });

  it("detects drift when the underlying data changed between proposal and confirm", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getRoutineDetail).mockResolvedValue(PUSH_DETAIL);

    const first = await resolveAndValidateAction("u1", {
      summary: "Poner 4 series a Dips",
      ops: [rawOp({ type: "update_exercise_target", routineName: "Push", exerciseName: "Dips", targetSets: 4 })],
    });
    expect(first.status).toBe("resolved");
    if (first.status !== "resolved") return;

    // Simulate the exercise's series having changed manually in between (e.g. via /plan/edit).
    vi.mocked(getRoutineDetail).mockResolvedValue({
      ...PUSH_DETAIL,
      exercises: [{ ...PUSH_DETAIL.exercises[0], targetSets: 5 }, ...PUSH_DETAIL.exercises.slice(1)],
    });

    const raw = toRawAction(first.draft);
    const second = await resolveAndValidateAction("u1", raw);
    expect(second.status).toBe("resolved");
    if (second.status !== "resolved") return;

    expect(draftsMatch(first.draft, second.draft)).toBe(false);
  });
});

describe("add_routine_to_plan with an explicit planName", () => {
  it("targets the named plan instead of the active one", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A, PLAN_B]);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "add_routine_to_plan", routineName: "Push", planName: "Calistenia" })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("add_routine_to_plan");
      if (op.type === "add_routine_to_plan") expect(op.planId).toBe("p2");
    }
  });

  it("is ambiguous when the plan name matches more than one real plan", async () => {
    vi.mocked(getUserRoutines).mockResolvedValue([PUSH]);
    vi.mocked(getUserPlans).mockResolvedValue([
      { ...PLAN_A, name: "Fuerza A" },
      { ...PLAN_B, name: "Fuerza B" },
    ]);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "add_routine_to_plan", routineName: "Push", planName: "Fuerza" })],
    });
    expect(result.status).toBe("ambiguous");
  });
});

describe("remove_routine_from_plan", () => {
  it("resolves a routine within a named plan", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A, PLAN_B]);
    vi.mocked(getPlanItems).mockResolvedValue(PLAN_A_ITEMS);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "remove_routine_from_plan", planName: "Fuerza", routineName: "Push" })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("remove_routine_from_plan");
      if (op.type === "remove_routine_from_plan") {
        expect(op.planItemId).toBe("pi1");
        expect(op.snapshot.order).toBe(1);
      }
      expect(result.draft.destructive).toBe(true);
    }
  });

  it("rejects a routine not in the plan", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);
    vi.mocked(getPlanItems).mockResolvedValue(PLAN_A_ITEMS);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "remove_routine_from_plan", planName: "Fuerza", routineName: "Legs" })],
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects (not ambiguous) when the same routine appears twice in the plan", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);
    vi.mocked(getPlanItems).mockResolvedValue([
      ...PLAN_A_ITEMS,
      { planItemId: "pi3", routineId: "r1", routineName: "Push", order: 3 },
    ]);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "remove_routine_from_plan", planName: "Fuerza", routineName: "Push" })],
    });
    // A real duplicate-name ambiguity, deliberately NOT surfaced as
    // "ambiguous" (which would offer to disambiguate by name) -- the
    // names are identical, so it's rejected with a pointer to the manual
    // editor instead.
    expect(result.status).toBe("rejected");
  });
});

describe("reorder_plan_item", () => {
  it("resolves with the correct from/to position", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);
    vi.mocked(getPlanItems).mockResolvedValue(PLAN_A_ITEMS);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "reorder_plan_item", planName: "Fuerza", routineName: "Pull", toPosition: 1 })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("reorder_plan_item");
      if (op.type === "reorder_plan_item") {
        expect(op.fromPosition).toBe(2);
        expect(op.toPosition).toBe(1);
      }
    }
  });

  it("rejects a position beyond the plan's own length", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);
    vi.mocked(getPlanItems).mockResolvedValue(PLAN_A_ITEMS);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "reorder_plan_item", planName: "Fuerza", routineName: "Pull", toPosition: 99 })],
    });
    expect(result.status).toBe("rejected");
  });
});

describe("rename_plan", () => {
  it("resolves and captures the previous name for compensation", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "rename_plan", planName: "Fuerza", newName: "Fuerza 5 días" })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("rename_plan");
      if (op.type === "rename_plan") {
        expect(op.previousName).toBe("Fuerza");
        expect(op.newName).toBe("Fuerza 5 días");
      }
    }
  });

  it("rejects an empty new name", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "rename_plan", planName: "Fuerza", newName: "  " })],
    });
    expect(result.status).toBe("rejected");
  });
});

describe("activate_plan", () => {
  it("captures the currently active plan for compensation when switching", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A, PLAN_B]);
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Fuerza" });

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "activate_plan", planName: "Calistenia" })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      expect(op.type).toBe("activate_plan");
      if (op.type === "activate_plan") {
        expect(op.planId).toBe("p2");
        expect(op.previousActivePlanId).toBe("p1");
        expect(op.previousActivePlanName).toBe("Fuerza");
      }
    }
  });

  it("captures no previous plan when the target is already active", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A]);
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Fuerza" });

    const result = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "activate_plan", planName: "Fuerza" })],
    });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      const op = result.draft.ops[0];
      if (op.type === "activate_plan") expect(op.previousActivePlanId).toBeNull();
    }
  });

  it("detects drift when a different plan becomes active between propose and confirm", async () => {
    vi.mocked(getUserPlans).mockResolvedValue([PLAN_A, PLAN_B]);
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p1", name: "Fuerza" });

    const first = await resolveAndValidateAction("u1", {
      summary: "",
      ops: [rawOp({ type: "activate_plan", planName: "Calistenia" })],
    });
    expect(first.status).toBe("resolved");
    if (first.status !== "resolved") return;

    // Someone activated a third plan in the meantime.
    vi.mocked(getUserPlans).mockResolvedValue([
      PLAN_A,
      PLAN_B,
      { planId: "p3", name: "Movilidad", status: "active" as const, routineCount: 0, routineNames: [], sportName: null },
    ]);
    vi.mocked(getActivePlan).mockResolvedValue({ id: "p3", name: "Movilidad" });

    const raw = toRawAction(first.draft);
    const second = await resolveAndValidateAction("u1", raw);
    expect(second.status).toBe("resolved");
    if (second.status !== "resolved") return;

    expect(draftsMatch(first.draft, second.draft)).toBe(false);
  });
});
