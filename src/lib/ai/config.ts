import "server-only";

/**
 * The one place `OPENAI_API_KEY`/`COACH_MODEL` are read. Never import this
 * from a Client Component (the `"server-only"` guard makes that a build
 * error) and never re-export the key itself past `getOpenAIApiKey()`'s
 * caller (`provider.ts`, which hands it straight to the OpenAI SDK
 * constructor and never logs or returns it).
 *
 * `COACH_MODEL` default: "gpt-5.6" -- confirmed against OpenAI's current
 * API docs ("Choosing a model" guide, fetched via Context7 at
 * implementation time), which states it verbatim as "recommended as a
 * strong default for general-purpose text generation." Not invented, not
 * carried over from training-data memory. Override via the env var to pin
 * a snapshot or switch tiers -- nothing else in the app hardcodes a model
 * name.
 */

const DEFAULT_COACH_MODEL = "gpt-5.6";

export function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function getCoachModel(): string {
  return process.env.COACH_MODEL?.trim() || DEFAULT_COACH_MODEL;
}

/** Whether the AI Coach can make real calls right now -- the deterministic Coach V1 screen works regardless of this. */
export function isCoachAIConfigured(): boolean {
  return getOpenAIApiKey() != null;
}
