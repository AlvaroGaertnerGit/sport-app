# Exercise catalog seed

`public.exercises` is the single, shared catalog the whole app reads from
(routine editing, search, Progression Engine, and the future AI Coach). This
directory is where its content is authored and reviewed before it becomes a
real migration.

## Layout

```
supabase/seed/
  exercises/*.mjs              one file per muscle/equipment category
  generate-exercise-migration.mjs   validates + emits idempotent SQL
  README.md                    this file
```

Each category file exports a plain array of exercise objects:

```js
{
  slug: "barbell-curl",              // kebab-case, must be globally unique
  name: "Barbell Curl",              // English canonical name
  difficulty: "beginner",            // beginner | intermediate | advanced
  pattern: "pull",                   // push|pull|squat|hinge|carry|rotation|locomotion|core
  primary: ["biceps"],               // 1+, from the 12-value muscle enum
  secondary: ["forearms"],           // 0+, same enum
  equipment: ["barbell"],            // equipment.slug values, [] = bodyweight
  instructions: "...",               // one sentence, Spanish (matches existing rows)
  mistakes: "...",                   // one sentence, Spanish, optional
}
```

## How to add more exercises

1. Add entries to the relevant `exercises/*.mjs` file (or create a new
   category file and import it in `generate-exercise-migration.mjs`).
2. Run `node supabase/seed/generate-exercise-migration.mjs` — it validates
   every entry (enum values, non-empty primary muscles, no duplicate/
   colliding slugs) against `public.exercises`' real constraints and prints
   the generated SQL to stdout, with a summary to stderr.
3. Copy the reviewed SQL into a new timestamped file under
   `supabase/migrations/` (same naming convention as the rest of the
   folder: `YYYYMMDDHHMMSS_description.sql`) and apply it.

## How duplicates are avoided

`exercises.slug` is the only field with a real uniqueness guarantee
(`name` is intentionally not unique — several real variants share a family
name). Every insert in the generated SQL is `on conflict (slug) do
nothing`, so:

- Re-running an already-applied migration is a no-op.
- The validator also cross-checks new slugs against a hardcoded snapshot of
  slugs that existed in the DB at the time this system was built (see
  `EXISTING_SLUGS` in the generator) as a second, offline line of defense.

If you're adding a genuinely new variant of something that already exists,
give it a distinct, real name (`Close-Grip Bench Press`, not
`Bench Press 2`) — see `AGENTS.md` / `.claude/CLAUDE.md` §11 in the repo
root for the project's own rule against fabricated variants.

## How to check catalog integrity

```sql
-- duplicate slugs (should always be 0 rows -- slug is UNIQUE)
select slug, count(*) from public.exercises group by slug having count(*) > 1;

-- rows with an invalid/missing primary muscle relationship, etc. are
-- already impossible -- enforced by CHECK constraints in
-- supabase/migrations/20260820100005_exercises.sql.
```

## What's intentionally NOT here

- **No per-exercise `target_type`.** Reps vs. duration is decided per
  *routine* (`routine_exercises.target_type`), not per catalog exercise —
  that's an existing, deliberate design choice, not a gap.
- **No aliases/search-tags column.** Search matches on `name` via `ilike`
  (`src/lib/domain/exercises.ts`). If a real product need for aliases shows
  up later, that's a schema decision for its own phase, not something to
  bolt on here.
