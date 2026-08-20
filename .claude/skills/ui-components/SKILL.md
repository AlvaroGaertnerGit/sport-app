---
name: ui-components
description: Create or extend reusable UI components in src/components/ for Sport Coach, a mobile-first training PWA. Use whenever asked to build a new component, add a UI element (modal, dropdown, card, badge, form field, timer, session state indicator, ...), refactor duplicated UI into something shared, or decide between shadcn/ui and a custom component.
---

Styling rules (tokens, spacing, radius, contrast) live in the
`design-system` skill — this skill is about component *structure*: what
to reuse, what shape a new component takes, and how to keep it accessible.
Don't duplicate those rules here; load that skill too when you're about
to write className values.

**Current project state**: no component library is installed yet (no
`components.json`, no `src/components/ui/`). The steps below describe
the intended workflow once shadcn is set up — don't assume any specific
component already exists; run the check in §1 and read what it actually
finds.

## 1. Check before building

Never hand-roll a component that already exists locally or upstream:

```bash
node .claude/skills/ui-components/scripts/find-component.mjs "<what you need>"
```

This reports, in order:
1. **Already in this project** (`src/components/**`) — use/extend it.
2. **In the shadcn registry, not installed** — install it, don't rebuild it:
   ```bash
   npx shadcn add <name>          # e.g. npx shadcn add dialog
   ```
   Preview first with `npx shadcn add <name> --dry-run`, or read the
   source before installing with `npx shadcn view <name>`.
3. **No match anywhere** — build custom, starting from a template (§3).

If a shadcn component almost fits, install it and customize via its
`className`/variant props — don't fork the source to tweak one thing.

## 2. Interactive = accessible for free — don't hand-build it

Once shadcn is installed, its style choice will wrap an accessible
primitive layer (e.g. `@base-ui/react` or Radix, depending on what gets
chosen when component work actually starts — verify against Context7
before assuming which). Focus management, keyboard nav, `aria-*` state,
and portal/dismiss behavior for anything interactive (dialog, dropdown,
popover, tooltip, tabs, accordion, ...) come from that primitive layer.
**Never reimplement that logic by hand** — install the matching shadcn
component (§1) instead of writing raw `onClick`/`onKeyDown`/focus-trap
code for something that already has an accessible primitive upstream.

For genuinely custom interactive behavior with no upstream primitive
(this project will need some — see §6): still build it on a semantic
native element (`<button>`, not `<div onClick>`), and it must satisfy
every item in the checklist below before it ships.

## 3. Building custom (no match found)

Start from a template, don't start from a blank file:

- `templates/simple-component.tsx.template` — presentational, one look,
  no variants (modeled on `card.tsx`'s compound-parts pattern).
- `templates/variant-component.tsx.template` — has `variant`/`size`
  props via `cva` (modeled on `button.tsx`).

Both encode the conventions already in this codebase — match them
instead of inventing a new shape:

- Named function + named export (`export { ComponentName }`), no
  `default export`.
- `data-slot="component-name"` on the root element (used for `has-`/`in-`
  Tailwind selectors and testing hooks).
- `className` is the **first** destructured prop, merged **last** via
  `cn(...)` so callers can always override.
- Props type is `React.ComponentProps<"tag">` (or the wrapped
  primitive's own `.Props`) — extend the native/primitive element, don't
  invent a parallel prop API for things HTML already gives you (`id`,
  `onClick`, `disabled`, ...).
- `{...props}` spreads last, after every explicit attribute.

## 4. Composition over inheritance, one API surface

- A component that needs to render different structures for different
  cases takes **children/slots**, not a `type` prop that branches
  internally into unrelated markup. Look at `Card`/`CardHeader`/
  `CardContent`/`CardFooter` in `card.tsx` (`npx shadcn view card`) — a
  compound-component split, not one `<Card variant="with-footer">`.
- A component that needs different *looks* takes `variant`/`size` props
  via `cva` (§3) — that's the one legitimate place branching logic
  belongs.
- Keep the prop surface minimal: if you're about to add a 4th boolean
  flag, that's a sign the component should split into two, or the
  variation belongs in `cva` variants instead.
- If you're about to copy an existing component's JSX and tweak a few
  classes at the call site, stop — extend the original via `className`/
  variant props instead. Two near-identical components is the
  duplication this skill exists to prevent.

## 5. Accessibility checklist (before shipping any new component)

- Interactive elements are real `<button>`/`<a>`/native form controls —
  never a styled `<div>` with a click handler.
- Every focusable element has a visible `focus-visible:` state (the
  `design-system` audit catches `outline-none` with none).
- Icon-only controls have an accessible name (`aria-label`, not just a
  `title`).
- Images/icons that are purely decorative are `aria-hidden` or use
  `alt=""`; meaningful ones have real `alt` text.
- Color is never the only signal (pair with text/icon/shape).
- Touch targets ≥44×44px — see the `design-system` skill's size-scale
  guidance.
- If it's a compound/interactive pattern with no upstream primitive,
  verify keyboard-only operation actually works before calling it done.

## 6. Training-specific component patterns

This app's core interaction is a guided workout session driven on a
phone, often mid-set — these patterns matter more here than in a typical
CRUD UI:

- **Loading states**: never a bare blank screen. A component that reads
  async data (today's recommendation, exercise library, history) needs
  an explicit loading representation (skeleton matching the real
  layout, not a generic spinner swallowing the whole viewport).
- **Session states**: a `WorkoutSession` is `in_progress` / `completed`
  / `abandoned` (see `CLAUDE.md` §5) — any component that renders a
  session must visually distinguish these three, not just show/hide
  based on a boolean. Don't invent a fourth visual state that doesn't
  map to a real domain state.
- **Timers**: rest timers and duration-based sets (planks, holds) need a
  component that survives the user switching apps/locking the phone
  mid-rest — design the state (target duration, started-at timestamp)
  so the remaining time can be recomputed on return, not just decremented
  in memory and lost. Countdown visuals animate per the `motion` skill's
  tokens, never a hand-rolled duration/easing.
- **Fast logging forms**: registering a set (reps, weight, RPE) happens
  between sets, under time pressure — large touch targets, numeric
  inputs that don't require precise taps, minimal required fields (see
  the domain design: `SetLog` has no per-set free-text notes for exactly
  this reason). Optimize for "log this set in one hand in under 3
  seconds," not for capturing every possible field.
- **Confirmation UI for AI proposals**: the Coach IA's write proposals
  (see the `ai-coach` skill) render as a distinct block — before/after +
  Confirm/Reject — never as plain chat text the user has to parse.

## 7. Where components go

- `src/components/ui/` — shadcn-managed primitives (installed via
  `npx shadcn add`, or hand-authored ones following this skill). Treat
  files here as library code: generic, no feature-specific logic.
- `src/components/<feature>/` — components specific to one feature/page.
  If a component under a feature folder starts being imported from a
  second feature, that's the signal to promote it to `src/components/ui/`
  or a shared `src/components/` location — don't import across feature
  folders.
