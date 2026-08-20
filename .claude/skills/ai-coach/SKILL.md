---
name: ai-coach
description: Build or change the Coach IA — the sport/training-specialized assistant embedded in Sport Coach. Use whenever implementing chat UI, a coach API route, streaming responses, the system prompt, context-reading tools, or write-action tools (replace exercise, modify routine, postpone workout, reorder plan), or when reviewing that feature for domain scope, confirmation gating, latency, or graceful loading/error states.
---

This skill is scoped to what's specific to the *Coach IA*. Everything
else about this feature routes to a skill that already covers it — load
whichever applies alongside this one, don't duplicate their rules here:

- **`design-system`** — colors/spacing/radius for the chat/coach UI.
- **`ui-components`** — composition, `data-slot`, accessible primitives,
  session/loading states.
- **`performance`** — Server/Client Component boundaries, bundle size.
- **`architecture`** — duplication, file size/complexity, folder layout.

Domain rules the Coach IA must never violate live in the project
`CLAUDE.md` (§6 Planning rules, §7 AI rules, §16 domain-change rules) —
read those before designing any tool. This skill is about *how* to build
the AI layer; `CLAUDE.md` is about what it's allowed to decide.

API shapes below assume the Vercel AI SDK v5 (`ai`, `@ai-sdk/*`) as a
starting point — **verify against Context7 before installing/using it**,
re-check if the installed version differs (v4→v5 was a breaking rewrite
of `useChat`). Nothing here has been installed or run yet in this
project; treat the templates as a design starting point, not verified
working code.

## Non-negotiable: the Coach IA is domain-closed

The Coach IA answers questions about: exercises, technique, training,
routines, progression, planning, recovery/rest **as it relates to
training**, equipment, sport activities, sport performance. It refuses
anything outside that scope — it is not a general-purpose chatbot. This
must be enforced in the system prompt's boundaries section (see
`templates/system-prompt.ts.template`), not left implicit.

## Non-negotiable: read vs. write are structurally different paths

- **Reading user context** (goals, sports practiced, active plan,
  routines, recent history, progress) happens through explicit, scoped
  tools — recent/paginated data, never a full dump of the user's tables
  into the prompt.
- **Writing anything** (`replace_exercise`, `modify_routine`,
  `postpone_workout`, `add_exercise`, `reorder_plan`, `modify_plan`, ...)
  never touches the database directly from a tool call. Each write tool
  returns a **structured proposal** (what changes, from what, to what,
  why) that the UI renders as a diff/preview. Only an explicit user
  confirmation triggers persistence, and persistence goes through
  **the same domain action/validation a manual edit would use** — the AI
  is another caller of that action, never a parallel write path. This is
  `CLAUDE.md` §7/§16, restated here because it's the rule most likely to
  get silently violated by a "just wire it up" implementation shortcut.
- A write tool that reorders a `Plan` must produce a before/after of the
  `PlanItem` sequence, not a vague description — see `CLAUDE.md` §6 for
  why `Plan` never stores a mutable pointer, which is exactly what makes
  a reorder proposal safe to preview and apply atomically.

## Architecture (non-negotiable split)

```
src/lib/ai/providers.ts        ← ONE place provider/model config lives
src/lib/ai/system-prompt.ts    ← ONE place the prompt is built
src/lib/ai/tools/              ← ONE tool per file: read tools + write-proposal tools
src/app/api/coach/chat/route.ts      ← server-only: streamText, never imported by a client component
src/hooks/use-coach-chat.ts          ← ONE place useChat() is called
src/components/coach/CoachPanel.tsx  ← presentational only, zero AI imports
```

Server-only AI SDK code (`ai`, `@ai-sdk/*`) must never be imported by a
`"use client"` file — it reads API keys and its provider/tool logic has
no business in a client bundle. The hook is the seam: it's the only
client file allowed to know an endpoint exists; everything below it is
plain props.

## Building it: start from the templates, not a blank file

| File | Template |
|---|---|
| `src/lib/ai/providers.ts` | `templates/provider-registry.ts.template` |
| `src/lib/ai/system-prompt.ts` | `templates/system-prompt.ts.template` |
| `src/app/api/coach/chat/route.ts` | `templates/route.ts.template` |
| `src/hooks/use-coach-chat.ts` | `templates/use-coach-chat.ts.template` |
| `src/components/coach/CoachPanel.tsx` | `templates/CoachPanel.tsx.template` |
| First-run UX / suggested prompts | `templates/onboarding-flow.md.template` |

The templates are a structural starting point matching this project's
Server/Client boundary rules — **not** verified-working code (unlike the
project this skill was adapted from, nothing here has actually been run
against installed dependencies yet). Before trusting an API call shape,
verify it against Context7 for the version you actually install.

**Adding a provider later** is meant to be a one-line change to
`createProviderRegistry({...})` in `providers.ts` — if a second provider
needs touching more than that one file, the abstraction has leaked; fix
the registry, not the call sites.

**Adding a tool later** (read or write) is meant to be one new file
under `src/lib/ai/tools/` plus one registration line — not a change
scattered across the route handler and the prompt.

## After writing or changing coach code

```bash
node .claude/skills/ai-coach/scripts/audit-ai-coach.mjs src
```

| Rule | Catches |
|---|---|
| `server-only-ai-import-in-client` | `"use client"` file importing `ai`/`@ai-sdk/<provider>` — leaks provider/tool logic (and the code path to API keys) into the client bundle |
| `hardcoded-secret` | API key literals instead of `process.env` reads |
| `scattered-provider-config` | Provider calls/imports outside `src/lib/ai/` in 2+ files — should be centralized in the registry |
| `chat-hook-missing-error-state` | `useChat()` used but `error` never referenced — no error/retry UI |
| `chat-hook-missing-status-state` | `useChat()` used but `status` never referenced — no loading/streaming UI |

Exit code `1` if anything's flagged. Run the `performance` skill's audit
too — this one won't catch a generic unnecessary `"use client"`, only
AI-specific leaks. **This audit does not and cannot check the
propose→confirm→apply write path** — that's a manual review item, not a
static-analysis rule: verify by hand that every write tool returns a
proposal object and that persistence only happens after the confirming
UI action calls the real domain action.

## Deep dives

Read `reference/patterns.md` for the reasoning behind: prompt structure
and domain grounding (anti-hallucination + anti-scope-creep), context
retrieval scoping, the six latency techniques in priority order, and the
full loading/error state matrix (`ready`/`submitted`/`streaming`/`error`
→ four different UI states, not just happy-path).

## Before calling a Coach IA change done

- [ ] `audit-ai-coach.mjs` clean
- [ ] All four `status` values have visibly different UI — not just
      `ready` and `streaming`
- [ ] System prompt's boundaries section explicitly rejects off-domain
      questions, and you've manually tried an off-domain question to
      confirm it redirects instead of answering
- [ ] Every write tool returns a proposal object, never a direct
      mutation — traced the call path by hand, not assumed
- [ ] The confirming UI action calls the exact same domain
      action/validation a manual edit in the app would use
- [ ] System prompt has a grounding line telling the model to admit what
      it doesn't know, and every injected fact is real/current user data
- [ ] Manually killed the network mid-stream (devtools offline toggle)
      and confirmed the UI recovers instead of hanging
