import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `executeCoachActionOps` is the one place a confirmed `CoachActionDraft`
 * touches Supabase. No real transaction exists in this codebase (confirmed
 * during design), so these tests check the best-effort compensation
 * scheme directly: on a failure mid-batch, every already-completed op's
 * exact inverse must be called with the exact snapshot/position/value that
 * was captured when it ran.
 */

vi.mock("@/lib/domain", () => ({
  activatePlan: vi.fn(),
  addRoutineToPlan: vi.fn(),
  addExerciseToRoutine: vi.fn(),
  removeExerciseFromRoutine: vi.fn(),
  removePlanItem: vi.fn(),
  renamePlan: vi.fn(),
  replaceExerciseInRoutine: vi.fn(),
  reorderPlanItem: vi.fn(),
  reorderRoutineExercise: vi.fn(),
  restoreRoutineExerciseAt: vi.fn(),
  updateRoutineExerciseTarget: vi.fn(),
}));

const { executeCoachActionOps } = await import("../action-execution");
const {
  activatePlan,
  addRoutineToPlan,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  removePlanItem,
  renamePlan,
  replaceExerciseInRoutine,
  reorderPlanItem,
  reorderRoutineExercise,
  restoreRoutineExerciseAt,
  updateRoutineExerciseTarget,
} = await import("@/lib/domain");

const TARGET = { targetType: "reps" as const, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetDurationSeconds: null, targetWeightKg: null };

describe("executeCoachActionOps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the right domain function once for a single successful op", async () => {
    vi.mocked(addExerciseToRoutine).mockResolvedValue(undefined);

    const result = await executeCoachActionOps("u1", [
      { type: "add_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-fly", exerciseName: "Cable Fly", target: TARGET },
    ]);

    expect(result.status).toBe("ok");
    expect(addExerciseToRoutine).toHaveBeenCalledWith("u1", "r1", "ex-fly", TARGET);
    expect(removeExerciseFromRoutine).not.toHaveBeenCalled();
  });

  it("compensates a successful first op with its exact inverse when the second op fails", async () => {
    vi.mocked(addExerciseToRoutine).mockResolvedValue(undefined);
    vi.mocked(removeExerciseFromRoutine).mockResolvedValueOnce(undefined); // the compensation call
    vi.mocked(reorderRoutineExercise).mockRejectedValue(new Error("position out of range"));

    const result = await executeCoachActionOps("u1", [
      { type: "add_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-fly", exerciseName: "Cable Fly", target: TARGET },
      { type: "reorder_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-dips", exerciseName: "Dips", toPosition: 1, fromPosition: 2 },
    ]);

    expect(result.status).toBe("failed");
    // op 1 (add_exercise) succeeded, then op 2 failed -- op 1 must be undone via its inverse.
    expect(removeExerciseFromRoutine).toHaveBeenCalledWith("u1", "r1", "ex-fly");
  });

  it("restores a removed exercise at its exact original order/target when a later op fails", async () => {
    vi.mocked(removeExerciseFromRoutine).mockResolvedValue(undefined);
    vi.mocked(restoreRoutineExerciseAt).mockResolvedValue(undefined);
    vi.mocked(updateRoutineExerciseTarget).mockRejectedValue(new Error("exercise not found"));

    const snapshot = { order: 2, target: TARGET };
    const previousTarget = { ...TARGET, targetSets: 3 };
    const result = await executeCoachActionOps("u1", [
      { type: "remove_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-dips", exerciseName: "Dips", snapshot },
      {
        type: "update_exercise_target",
        routineId: "r1",
        routineName: "Push",
        exerciseId: "ex-bench",
        exerciseName: "Bench Press",
        targetSets: 4,
        previousTargetSets: 3,
        target: { ...previousTarget, targetSets: 4 },
        previousTarget,
      },
    ]);

    expect(result.status).toBe("failed");
    expect(restoreRoutineExerciseAt).toHaveBeenCalledWith("u1", "r1", "ex-dips", 2, TARGET);
  });

  it("restores the previous target value when update_exercise_target's compensation runs", async () => {
    vi.mocked(updateRoutineExerciseTarget).mockResolvedValueOnce(undefined); // the op itself
    vi.mocked(replaceExerciseInRoutine).mockRejectedValue(new Error("destination already in routine"));
    vi.mocked(updateRoutineExerciseTarget).mockResolvedValueOnce(undefined); // the compensation call

    const previousTarget = { ...TARGET, targetSets: 3 };
    const result = await executeCoachActionOps("u1", [
      {
        type: "update_exercise_target",
        routineId: "r1",
        routineName: "Push",
        exerciseId: "ex-bench",
        exerciseName: "Bench Press",
        targetSets: 4,
        previousTargetSets: 3,
        target: { ...previousTarget, targetSets: 4 },
        previousTarget,
      },
      { type: "replace_exercise", routineId: "r1", routineName: "Push", fromExerciseId: "ex-dips", fromExerciseName: "Dips", toExerciseId: "ex-bench", toExerciseName: "Bench Press" },
    ]);

    expect(result.status).toBe("failed");
    expect(updateRoutineExerciseTarget).toHaveBeenNthCalledWith(2, "u1", "r1", "ex-bench", previousTarget);
  });

  it("moves a reordered exercise back to its original position when a later op fails", async () => {
    vi.mocked(reorderRoutineExercise).mockResolvedValueOnce(undefined); // the op itself
    vi.mocked(addExerciseToRoutine).mockRejectedValue(new Error("already in routine"));
    vi.mocked(reorderRoutineExercise).mockResolvedValueOnce(undefined); // the compensation call

    const result = await executeCoachActionOps("u1", [
      { type: "reorder_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-dips", exerciseName: "Dips", toPosition: 1, fromPosition: 3 },
      { type: "add_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-fly", exerciseName: "Cable Fly", target: TARGET },
    ]);

    expect(result.status).toBe("failed");
    expect(reorderRoutineExercise).toHaveBeenNthCalledWith(2, "u1", "r1", "ex-dips", 3);
  });

  it("removes the plan_item created by add_routine_to_plan when a later op fails", async () => {
    vi.mocked(addRoutineToPlan).mockResolvedValue({ planItemId: "pi1" });
    vi.mocked(removePlanItem).mockResolvedValue({ removed: true });
    vi.mocked(addExerciseToRoutine).mockRejectedValue(new Error("already in routine"));

    const result = await executeCoachActionOps("u1", [
      { type: "add_routine_to_plan", planId: "p1", planName: "Rotación", routineId: "r1", routineName: "Push" },
      { type: "add_exercise", routineId: "r1", routineName: "Push", exerciseId: "ex-fly", exerciseName: "Cable Fly", target: TARGET },
    ]);

    expect(result.status).toBe("failed");
    expect(removePlanItem).toHaveBeenCalledWith("u1", "p1", "pi1");
  });

  it("re-adds a removed plan routine at its original position when a later op fails", async () => {
    vi.mocked(removePlanItem).mockResolvedValue({ removed: true });
    vi.mocked(addRoutineToPlan).mockResolvedValue({ planItemId: "pi-new" }); // the compensation re-add
    vi.mocked(renamePlan).mockRejectedValue(new Error("plan not found"));

    const result = await executeCoachActionOps("u1", [
      {
        type: "remove_routine_from_plan",
        planId: "p1",
        planName: "Rotación",
        planItemId: "pi1",
        routineId: "r1",
        routineName: "Push",
        snapshot: { order: 2 },
      },
      { type: "rename_plan", planId: "p1", previousName: "Rotación", newName: "Rotación 5 días" },
    ]);

    expect(result.status).toBe("failed");
    expect(addRoutineToPlan).toHaveBeenCalledWith("u1", "p1", "r1");
    expect(reorderPlanItem).toHaveBeenCalledWith("u1", "p1", "pi-new", 2);
  });

  it("moves a reordered plan item back to its original position when a later op fails", async () => {
    vi.mocked(reorderPlanItem).mockResolvedValueOnce(undefined); // the op itself
    vi.mocked(renamePlan).mockRejectedValue(new Error("plan not found"));
    vi.mocked(reorderPlanItem).mockResolvedValueOnce(undefined); // the compensation call

    const result = await executeCoachActionOps("u1", [
      { type: "reorder_plan_item", planId: "p1", planName: "Rotación", planItemId: "pi1", routineId: "r1", routineName: "Push", toPosition: 1, fromPosition: 3 },
      { type: "rename_plan", planId: "p1", previousName: "Rotación", newName: "Rotación 5 días" },
    ]);

    expect(result.status).toBe("failed");
    expect(reorderPlanItem).toHaveBeenNthCalledWith(2, "u1", "p1", "pi1", 3);
  });

  it("restores a plan's previous name when a later op fails", async () => {
    vi.mocked(renamePlan).mockResolvedValueOnce(undefined); // the op itself
    vi.mocked(activatePlan).mockRejectedValue(new Error("plan not found"));
    vi.mocked(renamePlan).mockResolvedValueOnce(undefined); // the compensation call

    const result = await executeCoachActionOps("u1", [
      { type: "rename_plan", planId: "p1", previousName: "Rotación", newName: "Rotación 5 días" },
      { type: "activate_plan", planId: "p1", planName: "Rotación 5 días", previousActivePlanId: "p2", previousActivePlanName: "Calistenia" },
    ]);

    expect(result.status).toBe("failed");
    expect(renamePlan).toHaveBeenNthCalledWith(2, "u1", "p1", "Rotación");
  });

  it("re-activates the previously active plan when a later op fails", async () => {
    vi.mocked(activatePlan).mockResolvedValueOnce(undefined); // the op itself
    vi.mocked(renamePlan).mockRejectedValue(new Error("plan not found"));
    vi.mocked(activatePlan).mockResolvedValueOnce(undefined); // the compensation call

    const result = await executeCoachActionOps("u1", [
      { type: "activate_plan", planId: "p1", planName: "Rotación", previousActivePlanId: "p2", previousActivePlanName: "Calistenia" },
      { type: "rename_plan", planId: "p3", previousName: "Otro", newName: "Otro 2" },
    ]);

    expect(result.status).toBe("failed");
    expect(activatePlan).toHaveBeenNthCalledWith(2, "u1", "p2");
  });

  it("fails the whole batch when removing a plan routine that has session history", async () => {
    vi.mocked(removePlanItem).mockResolvedValue({ removed: false, reason: "has_history" });

    const result = await executeCoachActionOps("u1", [
      {
        type: "remove_routine_from_plan",
        planId: "p1",
        planName: "Rotación",
        planItemId: "pi1",
        routineId: "r1",
        routineName: "Push",
        snapshot: { order: 1 },
      },
    ]);

    expect(result.status).toBe("failed");
    expect(addRoutineToPlan).not.toHaveBeenCalled(); // nothing to compensate -- the op itself never succeeded
  });
});
