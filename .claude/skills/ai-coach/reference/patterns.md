# Coach IA patterns — detail

Assumed API surface: Vercel AI SDK v5 (`/vercel/ai`). **Verify against
Context7 once the SDK is actually installed** — v4→v5 changed `useChat`'s
API shape substantially (message `parts[]`, `sendMessage` instead of
`handleSubmit`+`input` state, `@ai-sdk/react` as a separate package), so
don't pattern-match old tutorials without checking the version actually
installed. Nothing in this reference has been run in this project yet.

## Prompt engineering structure

Every system prompt should have these sections, in this order (see
`system-prompt.ts.template`):

1. **Identity** — a sport/training coach, not a generic assistant. State
   this plainly so the model doesn't default to a neutral chatbot voice.
2. **Domain boundaries** — the closed list of topics it answers
   (exercises, technique, training, routines, progression, planning,
   recovery/rest tied to training, equipment, sport activities,
   performance) and the explicit instruction to redirect anything else
   ("that's outside what I help with — I'm focused on your training").
   This section is what makes the Coach IA *not* a general chatbot; it
   is not optional and not a soft suggestion.
3. **Grounding** — what it actually knows, and the explicit instruction
   to say "I don't have that in your data" rather than generate a
   plausible guess about the user's history/plan/progress. This is the
   single highest-leverage line against hallucinating training data that
   was never actually logged.
4. **Injected context** — real, current data pulled through the read
   tools (recent sessions, active plan, goals), passed as tool results,
   not hardcoded into the prompt string. Keeps the coach's answers in
   sync with what actually happened instead of a stale snapshot.
5. **Response shape** — length, format, when to break the default (a
   chat widget default should be short; let the user's question pull for
   more detail — a "how do I do a pull-up" question wants a structured
   step list, a "how am I doing" question wants two sentences, not a
   report).
6. **Write-action framing** — how the model should describe a proposed
   change (what/why, never phrased as already done) and that it must
   always end with an explicit ask for confirmation, never assume it.

Keep the whole prompt as short as it can be while covering these — an
unnecessarily long system prompt adds latency (more tokens to process
before the first output token) and gives the model more surface to
contradict itself against.

## Context retrieval — read tools

- Each read tool is scoped and paginated: "last N sessions", "active
  plan only", "goals with status=active" — never "give me everything
  this user has ever logged."
- Tool results are the only source of truth for user data injected into
  the conversation. The model never asserts something about the user's
  history that didn't come back from a tool call in this turn.
- `convertToModelMessages(messages)` sends the full UI message history
  by default. For a long-running conversation, trim to the last N turns
  (or summarize older ones) before calling `streamText` — don't let the
  request grow unbounded turn over turn.

## Write tools — proposal, not mutation

Every write tool (`replace_exercise`, `modify_routine`,
`postpone_workout`, `add_exercise`, `reorder_plan`, `modify_plan`, ...)
returns a structured object describing the change — never performs it.
Minimum shape to design for: what entity/field changes, the current
value, the proposed value, and a short reason. The route handler/tool
implementation must not call any domain mutation — that only happens
after the user confirms in the UI, through the app's normal domain
action for that change (see `CLAUDE.md` §7). A tool that both proposes
and applies in the same call is the one mistake this pattern exists to
prevent.

## Latency techniques, roughly in order of impact

1. **Stream, always.** Never buffer the full response server-side before
   sending — `toUIMessageStreamResponse()` starts sending as soon as the
   first token arrives. This is the single biggest perceived-latency
   win; without it every other optimization is moot.
2. **Optimistic user-message render.** `useChat`'s `sendMessage` already
   renders the user's own message before the network call resolves —
   don't add a manual "sending..." gate in front of it.
3. **Short system prompt.** Every token in the system prompt delays
   time-to-first-output-token. Keep it as tight as §Prompt engineering
   structure allows.
4. **Right-sized model.** A faster/smaller model for most coaching Q&A
   will usually feel more responsive than the largest available model,
   at a lower cost — reserve a larger model for turns that actually
   invoke write tools or need multi-step reasoning about a full plan.
5. **`maxDuration` set deliberately**, not left at a platform default —
   see `route.ts.template`. Too short kills a legitimate long
   explanation; too long delays failure feedback when something's stuck.
6. **Forward `abortSignal`.** If the user navigates away or hits Stop,
   the upstream provider call should actually cancel (saves cost, frees
   the connection) — see `route.ts.template`'s `abortSignal: req.signal`.

## Loading/error state matrix

`useChat`'s `status` is one of `"ready" | "submitted" | "streaming" |
"error"` — map all four, not just the happy path:

| Status | UI |
|---|---|
| `ready` | Input enabled, send button enabled when there's text |
| `submitted` | Input disabled, "Thinking…" indicator, Stop button visible |
| `streaming` | Input disabled, tokens appending live, Stop button visible |
| `error` | Error banner + Retry (`regenerate()`), input re-enabled |

`audit-ai-coach.mjs`'s `chat-hook-missing-error-state` /
`-status-state` rules exist because it's easy to wire up the happy path
and ship without ever testing what the other three look like.

## A write proposal in the UI is a fifth state, not a variant of `streaming`

Once a write tool returns a proposal, the conversation is in a distinct
state — waiting on a domain decision, not on the model. Render it as its
own block (diff/preview + Confirm/Reject), not folded into the message
bubble as plain text the user has to parse. Confirming calls the real
domain action and only then shows the result as applied; rejecting just
continues the conversation with nothing persisted.
