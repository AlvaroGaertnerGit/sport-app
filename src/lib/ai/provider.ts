import "server-only";

import OpenAI from "openai";

import { getOpenAIApiKey } from "./config";

/**
 * The provider boundary (brief §47): `CoachService` never imports `openai`
 * directly, only this interface -- swapping models/providers later touches
 * this file, not the tool loop or the route handler. Deliberately thin
 * (one method) -- not a five-layer abstraction for a single-provider app.
 *
 * Shapes below mirror the Responses API's own `input`/`output` item shapes
 * (confirmed against OpenAI's current docs, not guessed): a message is
 * `{role, content}` on the way in and `{type:"message", text}` on the way
 * out; a tool round-trip is a `function_call` output item answered by a
 * `function_call_output` input item keyed on `call_id`. Adopting this
 * shape directly (rather than inventing a parallel one) keeps the tool
 * loop in `coach-service.ts` a straight passthrough.
 */

export type CoachInputItem =
  | { role: "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

export type CoachToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: true;
};

export type CoachOutputItem =
  | { type: "message"; text: string }
  | { type: "function_call"; callId: string; name: string; arguments: string }
  | { type: "refusal"; text: string };

export type CoachProviderResult = {
  output: CoachOutputItem[];
  /** Null when the provider doesn't report usage (e.g. MockCoachProvider). Never sent to the client -- dev-time cost visibility only, see route.ts. */
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
};

export class CoachProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "CoachProviderError";
  }
}

export interface CoachProvider {
  respond(params: {
    model: string;
    instructions: string;
    input: CoachInputItem[];
    tools: CoachToolDefinition[];
  }): Promise<CoachProviderResult>;
}

/**
 * Real provider. `getOpenAIApiKey()`/`getCoachModel()` are the only touch
 * points with env vars -- the key itself never leaves this function (not
 * logged, not echoed in the thrown error, not part of `CoachProviderResult`).
 */
export class OpenAIProvider implements CoachProvider {
  private client(): OpenAI {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new CoachProviderError("OpenAI API key is not configured.");
    }
    return new OpenAI({ apiKey });
  }

  async respond(params: {
    model: string;
    instructions: string;
    input: CoachInputItem[];
    tools: CoachToolDefinition[];
  }): Promise<CoachProviderResult> {
    try {
      const response = await this.client().responses.create({
        model: params.model,
        instructions: params.instructions,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the SDK's own input union type doesn't export cleanly; the shape is confirmed against current docs above.
        input: params.input as any,
        tools: params.tools,
      });

      const output: CoachOutputItem[] = [];
      for (const item of response.output) {
        if (item.type === "message") {
          for (const part of item.content) {
            if (part.type === "output_text") {
              output.push({ type: "message", text: part.text });
            } else if (part.type === "refusal") {
              output.push({ type: "refusal", text: part.refusal });
            }
          }
        } else if (item.type === "function_call") {
          output.push({ type: "function_call", callId: item.call_id, name: item.name, arguments: item.arguments });
        }
      }

      const usage = response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null;

      return { output, usage };
    } catch (err) {
      // Server-side only, and never the key: OpenAI's SDK errors include
      // status/message but never echo the Authorization header back.
      console.error("[coach] OpenAI request failed:", err instanceof Error ? err.message : err);
      throw new CoachProviderError("The AI Coach request failed.", err);
    }
  }
}

/**
 * For unit tests (brief §46) -- no real network call, no API key needed.
 * `script` lets a test drive a specific sequence of turns (e.g. "first
 * call returns a tool call, second call returns the final message") the
 * same way the real API would across a tool-loop.
 */
export class MockCoachProvider implements CoachProvider {
  private callIndex = 0;
  constructor(private readonly script: CoachProviderResult[]) {}

  async respond(): Promise<CoachProviderResult> {
    const result = this.script[this.callIndex] ?? this.script[this.script.length - 1];
    this.callIndex += 1;
    return result;
  }
}
