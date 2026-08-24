import "server-only";

import { getCoachModel } from "./config";
import { buildCoachBaselineContext } from "./context";
import { buildSystemPrompt } from "./prompts";
import { OpenAIProvider, type CoachInputItem, type CoachProvider } from "./provider";
import { COACH_TOOLS, executeCoachTool } from "./tools";
import type { RoutineDraft } from "./routine-draft";
import type { CoachActionDraft } from "./action-draft";
import type { PlanDraft } from "./plan-draft";

/**
 * Ties context + tools + provider together into one conversational turn
 * (brief §47's "Coach Service"). This is the only place that runs the
 * tool loop -- the route handler calls this once per user message and
 * gets back a plain result, never touching the provider or tool dispatch
 * itself.
 */

export type CoachMessage = { role: "user" | "assistant"; content: string };

export type CoachTurnResult = {
  reply: string;
  draft: RoutineDraft | null;
  draftRejectedReason: string | null;
  actionDraft: CoachActionDraft | null;
  actionRejectedReason: string | null;
  planDraft: PlanDraft | null;
  planDraftRejectedReason: string | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
};

/** Hard cap on tool round-trips per user message -- a safety net against a runaway loop, not a normal-case limit (a real turn is 0-3 tool calls). */
const MAX_TOOL_ITERATIONS = 6;

export async function runCoachTurn(params: {
  userId: string;
  message: string;
  history: readonly CoachMessage[];
  currentDraft: RoutineDraft | null;
  currentActionDraft: CoachActionDraft | null;
  currentPlanDraft: PlanDraft | null;
  provider?: CoachProvider;
}): Promise<CoachTurnResult> {
  const provider = params.provider ?? new OpenAIProvider();
  const model = getCoachModel();

  const context = await buildCoachBaselineContext(params.userId);
  const instructions = buildSystemPrompt(context, params.currentDraft, params.currentActionDraft, params.currentPlanDraft);

  const input: CoachInputItem[] = [
    ...params.history.map((m) => ({ role: m.role, content: m.content }) as const),
    { role: "user", content: params.message },
  ];

  let draft: RoutineDraft | null = null;
  let draftRejectedReason: string | null = null;
  let actionDraft: CoachActionDraft | null = null;
  let actionRejectedReason: string | null = null;
  let planDraft: PlanDraft | null = null;
  let planDraftRejectedReason: string | null = null;
  let totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let sawUsage = false;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await provider.respond({ model, instructions, input, tools: COACH_TOOLS });

    if (result.usage) {
      sawUsage = true;
      totalUsage = {
        inputTokens: totalUsage.inputTokens + result.usage.inputTokens,
        outputTokens: totalUsage.outputTokens + result.usage.outputTokens,
        totalTokens: totalUsage.totalTokens + result.usage.totalTokens,
      };
    }

    const functionCalls = result.output.filter((item) => item.type === "function_call");
    const messageParts = result.output.filter((item) => item.type === "message");
    const refusals = result.output.filter((item) => item.type === "refusal");

    if (functionCalls.length === 0) {
      const reply = messageParts.map((m) => m.text).join("\n\n") || refusals.map((r) => r.text).join("\n\n");
      return {
        reply: reply || "No he podido generar una respuesta.",
        draft,
        draftRejectedReason,
        actionDraft,
        actionRejectedReason,
        planDraft,
        planDraftRejectedReason,
        usage: sawUsage ? totalUsage : null,
      };
    }

    for (const call of functionCalls) {
      input.push({ type: "function_call", call_id: call.callId, name: call.name, arguments: call.arguments });
      const toolResult = await executeCoachTool(params.userId, call.name, call.arguments);
      input.push({ type: "function_call_output", call_id: call.callId, output: toolResult.output });

      if (toolResult.sideEffect?.type === "routine_draft") {
        draft = toolResult.sideEffect.draft;
        draftRejectedReason = null;
      } else if (toolResult.sideEffect?.type === "routine_draft_rejected") {
        draftRejectedReason = toolResult.sideEffect.reason;
      } else if (toolResult.sideEffect?.type === "action_draft") {
        actionDraft = toolResult.sideEffect.draft;
        actionRejectedReason = null;
      } else if (toolResult.sideEffect?.type === "action_rejected") {
        actionRejectedReason = toolResult.sideEffect.reason;
      } else if (toolResult.sideEffect?.type === "plan_draft") {
        planDraft = toolResult.sideEffect.draft;
        planDraftRejectedReason = null;
      } else if (toolResult.sideEffect?.type === "plan_draft_rejected") {
        planDraftRejectedReason = toolResult.sideEffect.reason;
      }
    }
  }

  return {
    reply: "No he podido completar la respuesta -- inténtalo de nuevo con una pregunta más concreta.",
    draft,
    actionDraft,
    actionRejectedReason,
    draftRejectedReason,
    planDraft,
    planDraftRejectedReason,
    usage: sawUsage ? totalUsage : null,
  };
}
