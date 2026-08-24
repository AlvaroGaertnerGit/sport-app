import { describe, expect, it, vi } from "vitest";

import type { CoachProvider, CoachProviderResult } from "../provider";

vi.mock("@/lib/domain/coach", () => ({
  getCoachSummary: vi.fn(async () => ({
    hasData: true,
    workoutsCompleted: 6,
    sessionsPerWeek: 3.5,
    currentStreakDays: 2,
    improving: [],
    maintaining: [],
    insufficientData: [],
  })),
}));

vi.mock("../tools", () => ({
  COACH_TOOLS: [],
  executeCoachTool: vi.fn(),
}));

const { runCoachTurn } = await import("../coach-service");
const { MockCoachProvider } = await import("../provider");
const { executeCoachTool } = await import("../tools");

type CoachProviderRespondParams = Parameters<CoachProvider["respond"]>[0];

/** Records the `instructions` string each call was built with -- the only way to check `runCoachTurn` actually threaded `currentActionDraft` into the system prompt, since `MockCoachProvider` itself discards its params. */
class RecordingProvider implements CoachProvider {
  calls: CoachProviderRespondParams[] = [];
  constructor(private readonly script: CoachProviderResult[]) {}
  async respond(params: CoachProviderRespondParams) {
    this.calls.push(params);
    return this.script[this.calls.length - 1] ?? this.script[this.script.length - 1];
  }
}

describe("runCoachTurn", () => {
  it("returns the model's reply directly when no tool call is made", async () => {
    const provider = new MockCoachProvider([{ output: [{ type: "message", text: "Has entrenado 6 veces." }], usage: null }]);

    const result = await runCoachTurn({ userId: "u1", message: "¿Cómo estoy progresando?", history: [], currentDraft: null, currentActionDraft: null, currentPlanDraft: null, provider });

    expect(result.reply).toBe("Has entrenado 6 veces.");
    expect(result.draft).toBeNull();
  });

  it("executes a tool call and feeds the result back before returning the final reply", async () => {
    vi.mocked(executeCoachTool).mockResolvedValue({ output: JSON.stringify({ workoutsCompleted: 6 }) });

    const provider = new MockCoachProvider([
      { output: [{ type: "function_call", callId: "call_1", name: "getTrainingSummary", arguments: "{}" }], usage: null },
      { output: [{ type: "message", text: "Has entrenado 6 veces en 30 días." }], usage: null },
    ]);

    const result = await runCoachTurn({ userId: "u1", message: "¿Cómo estoy progresando?", history: [], currentDraft: null, currentActionDraft: null, currentPlanDraft: null, provider });

    expect(executeCoachTool).toHaveBeenCalledWith("u1", "getTrainingSummary", "{}");
    expect(result.reply).toBe("Has entrenado 6 veces en 30 días.");
  });

  it("surfaces an accepted routine draft as a side effect, not as DB state", async () => {
    const draft = { name: "Pecho", description: null, addToActivePlan: false, activePlanName: null, exercises: [] };
    vi.mocked(executeCoachTool).mockResolvedValue({
      output: JSON.stringify({ accepted: true, draft }),
      sideEffect: { type: "routine_draft", draft },
    });

    const provider = new MockCoachProvider([
      { output: [{ type: "function_call", callId: "call_1", name: "propose_routine_draft", arguments: "{}" }], usage: null },
      { output: [{ type: "message", text: "Te propongo esta rutina." }], usage: null },
    ]);

    const result = await runCoachTurn({ userId: "u1", message: "Créame una rutina de pecho", history: [], currentDraft: null, currentActionDraft: null, currentPlanDraft: null, provider });

    expect(result.draft).toEqual(draft);
    expect(result.draftRejectedReason).toBeNull();
  });

  it("reports a rejected draft reason without inventing a fallback exercise", async () => {
    vi.mocked(executeCoachTool).mockResolvedValue({
      output: JSON.stringify({ accepted: false, reason: "Estos ejercicios no existen en el catálogo: Quantum Flux Curl." }),
      sideEffect: { type: "routine_draft_rejected", reason: "Estos ejercicios no existen en el catálogo: Quantum Flux Curl." },
    });

    const provider = new MockCoachProvider([
      { output: [{ type: "function_call", callId: "call_1", name: "propose_routine_draft", arguments: "{}" }], usage: null },
      { output: [{ type: "message", text: "No he podido preparar una rutina válida con esos ejercicios." }], usage: null },
    ]);

    const result = await runCoachTurn({
      userId: "u1",
      message: "Créame una rutina con Quantum Flux Curl",
      history: [],
      currentDraft: null,
      currentActionDraft: null,
      currentPlanDraft: null,
      provider,
    });

    expect(result.draft).toBeNull();
    expect(result.draftRejectedReason).toMatch(/Quantum Flux Curl/);
  });

  it("surfaces an accepted action draft as a side effect, not as DB state", async () => {
    const draft = { summary: "Quitar Dips de Push", ops: [], destructive: true };
    vi.mocked(executeCoachTool).mockResolvedValue({
      output: JSON.stringify({ accepted: true, draft }),
      sideEffect: { type: "action_draft", draft },
    });

    const provider = new MockCoachProvider([
      { output: [{ type: "function_call", callId: "call_1", name: "propose_action", arguments: "{}" }], usage: null },
      { output: [{ type: "message", text: "Te propongo este cambio." }], usage: null },
    ]);

    const result = await runCoachTurn({ userId: "u1", message: "Quita los fondos de Push", history: [], currentDraft: null, currentActionDraft: null, currentPlanDraft: null, provider });

    expect(result.actionDraft).toEqual(draft);
    expect(result.actionRejectedReason).toBeNull();
  });

  it("never populates an action draft when no tool was called", async () => {
    const provider = new MockCoachProvider([{ output: [{ type: "message", text: "Claro, dime qué quieres cambiar." }], usage: null }]);

    const result = await runCoachTurn({ userId: "u1", message: "Hola", history: [], currentDraft: null, currentActionDraft: null, currentPlanDraft: null, provider });

    expect(result.actionDraft).toBeNull();
    expect(result.actionRejectedReason).toBeNull();
  });

  it("threads a pending currentActionDraft into the system prompt so a chained edit resolves against it", async () => {
    const pending = {
      summary: "Quitar Dips de Push",
      ops: [{ type: "remove_exercise" as const, routineId: "r1", routineName: "Push", exerciseId: "ex-dips", exerciseName: "Dips", snapshot: { order: 1, target: { targetType: "reps" as const, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetDurationSeconds: null, targetWeightKg: null } } }],
      destructive: true,
    };
    const provider = new RecordingProvider([{ output: [{ type: "message", text: "De acuerdo." }], usage: null }]);

    await runCoachTurn({ userId: "u1", message: "y también sube el peso", history: [], currentDraft: null, currentActionDraft: pending, currentPlanDraft: null, provider });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].instructions).toContain("CURRENT PENDING ACTION");
    expect(provider.calls[0].instructions).toContain("Quitar Dips de Push");
  });
});
