#!/usr/bin/env node
// Validates every category file under supabase/seed/exercises/ and emits a
// single idempotent SQL migration. Re-running this script (and re-applying
// the migration) is always safe: every insert is `on conflict (slug) do
// nothing`, keyed on the same unique constraint the schema already has.
//
// Usage: node supabase/seed/generate-exercise-migration.mjs > /tmp/out.sql
// (the actual project workflow pastes the reviewed SQL into a real
// timestamped file under supabase/migrations/, see README.md in this dir)

import chest from "./exercises/chest.mjs";
import back from "./exercises/back.mjs";
import shoulders from "./exercises/shoulders.mjs";
import arms from "./exercises/arms.mjs";
import legs from "./exercises/legs.mjs";
import core from "./exercises/core.mjs";
import calisthenics from "./exercises/calisthenics.mjs";
import kettlebell from "./exercises/kettlebell.mjs";
import bands from "./exercises/bands.mjs";
import cable from "./exercises/cable.mjs";
import machines from "./exercises/machines.mjs";
import plyometrics from "./exercises/plyometrics.mjs";

const CATEGORIES = {
  chest, back, shoulders, arms, legs, core,
  calisthenics, kettlebell, bands, cable, machines, plyometrics,
};

const VALID_DIFFICULTY = new Set(["beginner", "intermediate", "advanced"]);
const VALID_PATTERN = new Set([
  "push", "pull", "squat", "hinge", "carry", "rotation", "locomotion", "core",
]);
const VALID_MUSCLE = new Set([
  "chest", "back", "lats", "shoulders", "biceps", "triceps", "forearms",
  "core", "glutes", "quadriceps", "hamstrings", "calves",
]);
// Existing 10 (seed.sql) + 5 this migration adds (see NEW_EQUIPMENT below).
const VALID_EQUIPMENT = new Set([
  "pull_up_bar", "parallel_bars", "resistance_band", "dumbbells", "barbell",
  "bench", "cable_machine", "kettlebell", "gym_machine", "mat",
  "plate", "suspension_trainer", "box", "ab_wheel", "other",
]);
// Confirmed live against the DB before writing any category file
// (`select slug from public.exercises`) -- kept here as a second,
// offline line of defense; `on conflict (slug) do nothing` in the SQL
// itself is the actual safety net at apply time.
const EXISTING_SLUGS = new Set([
  "arch-hold","assisted-pull-up","australian-pull-up","backhand-drive","bandeja",
  "barbell-bench-press","barbell-row","barbell-squat","battle-ropes","bench-dip",
  "bodyweight-squat","boulder-traverse","box-jump","bulgarian-split-squat","burpee",
  "cadence-intervals","calf-raise","campus-board-reach","cat-cow","chin-up",
  "conventional-deadlift","cross","crunch","dead-hang","defensive-slide","derecha",
  "diamond-push-up","dips","downward-dog","dribbling-drill","dumbbell-bench-press",
  "dumbbell-row","dumbbell-shoulder-press","easy-run","face-pull","farmers-carry",
  "footwork-drill","forehand-drive","freestyle-swim","front-raise","front-squat",
  "glute-bridge","goblet-squat","handstand-push-up","hanging-knee-raise",
  "hanging-leg-raise","heavy-bag-round","hill-climb-ride","hill-sprint","hip-opener",
  "hip-thrust","hollow-body-hold","hook","incline-bench-press","incline-push-up",
  "interval-run","interval-swim-set","inverted-row","jab","kettlebell-snatch",
  "kettlebell-swing","kick-drill","l-sit","lat-pulldown","lateral-raise","layup",
  "leg-curl","leg-extension","leg-press","long-run","muscle-up","overhead-press",
  "pase-corto","pendlay-row","pigeon-pose","pike-push-up","pilates-hundred",
  "pilates-roll-up","plank","pull-buoy-swim","pull-up","push-up","regate","remate",
  "reverse-lunge","reves","romanian-deadlift","rowing-sprint","russian-twist","saque",
  "serve","shadow-boxing","side-plank","smash","sprint","sprint-con-balon",
  "steady-state-ride","step-up","sun-salutation","tempo-run","thoracic-rotation",
  "toes-to-bar","turkish-get-up","uppercut","v-up","vibora","volley","walking-lunge",
  "wall-ball-shot","weighted-pull-up","wide-push-up","zercher-squat",
]);
const NEW_EQUIPMENT = [
  ["plate", "Discos"],
  ["suspension_trainer", "TRX / Suspensión"],
  ["box", "Cajón pliométrico"],
  ["ab_wheel", "Rueda abdominal"],
  ["other", "Otro"],
];

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}
function sqlArray(values) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}
function sqlNullableString(value) {
  return value ? sqlString(value) : "null";
}

function validate() {
  const errors = [];
  const seenSlugs = new Set();

  for (const [category, list] of Object.entries(CATEGORIES)) {
    for (const ex of list) {
      const where = `${category}/${ex.slug}`;
      if (!ex.slug || !/^[a-z0-9-]+$/.test(ex.slug)) errors.push(`${where}: invalid slug`);
      if (seenSlugs.has(ex.slug)) errors.push(`${where}: duplicate slug within new data`);
      seenSlugs.add(ex.slug);
      if (EXISTING_SLUGS.has(ex.slug)) errors.push(`${where}: slug already exists in DB`);
      if (!VALID_DIFFICULTY.has(ex.difficulty)) errors.push(`${where}: invalid difficulty "${ex.difficulty}"`);
      if (!VALID_PATTERN.has(ex.pattern)) errors.push(`${where}: invalid movement_pattern "${ex.pattern}"`);
      if (!Array.isArray(ex.primary) || ex.primary.length === 0) errors.push(`${where}: primary muscles empty`);
      for (const m of ex.primary ?? []) if (!VALID_MUSCLE.has(m)) errors.push(`${where}: invalid primary muscle "${m}"`);
      for (const m of ex.secondary ?? []) if (!VALID_MUSCLE.has(m)) errors.push(`${where}: invalid secondary muscle "${m}"`);
      for (const eq of ex.equipment ?? []) if (!VALID_EQUIPMENT.has(eq)) errors.push(`${where}: invalid equipment "${eq}"`);
      if (!ex.name || !ex.name.trim()) errors.push(`${where}: missing name`);
      if (!ex.instructions || !ex.instructions.trim()) errors.push(`${where}: missing instructions`);
    }
  }
  return errors;
}

function buildSql() {
  const lines = [];
  lines.push("-- Exercise catalog expansion: idempotent bulk seed generated from");
  lines.push("-- supabase/seed/exercises/*.mjs -- see supabase/seed/README.md.");
  lines.push("-- Safe to re-run: every insert is `on conflict do nothing`.");
  lines.push("");
  lines.push("-- New equipment slugs (data only, no schema change) ------------------");
  lines.push("insert into public.equipment (slug, name) values");
  lines.push(NEW_EQUIPMENT.map(([slug, name]) => `  (${sqlString(slug)}, ${sqlString(name)})`).join(",\n") + "\non conflict (slug) do nothing;");
  lines.push("");
  lines.push("-- Exercises -------------------------------------------------------------");
  lines.push("insert into public.exercises (slug, name, difficulty, movement_pattern, primary_muscles, secondary_muscles, instructions, common_mistakes) values");

  const allExercises = [];
  for (const list of Object.values(CATEGORIES)) allExercises.push(...list);

  const exerciseRows = allExercises.map((ex) => {
    return `  (${sqlString(ex.slug)}, ${sqlString(ex.name)}, ${sqlString(ex.difficulty)}, ${sqlString(ex.pattern)}, ${sqlArray(ex.primary)}, ${sqlArray(ex.secondary ?? [])}, ${sqlString(ex.instructions)}, ${sqlNullableString(ex.mistakes)})`;
  });
  lines.push(exerciseRows.join(",\n") + "\non conflict (slug) do nothing;");
  lines.push("");

  lines.push("-- Equipment links --------------------------------------------------------");
  lines.push("insert into public.exercise_equipment (exercise_id, equipment_slug)");
  lines.push("select e.id, x.equipment_slug");
  lines.push("from (values");
  const linkRows = [];
  for (const ex of allExercises) {
    for (const eq of ex.equipment ?? []) {
      linkRows.push(`  (${sqlString(ex.slug)}, ${sqlString(eq)})`);
    }
  }
  lines.push(linkRows.join(",\n"));
  lines.push(") as x(exercise_slug, equipment_slug)");
  lines.push("join public.exercises e on e.slug = x.exercise_slug");
  lines.push("on conflict (exercise_id, equipment_slug) do nothing;");
  lines.push("");

  return { sql: lines.join("\n"), count: allExercises.length, linkCount: linkRows.length };
}

const errors = validate();
if (errors.length > 0) {
  process.stderr.write(`VALIDATION FAILED (${errors.length} errors):\n`);
  for (const e of errors) process.stderr.write(`  - ${e}\n`);
  process.exit(1);
}

const { sql, count, linkCount } = buildSql();
process.stderr.write(`OK: ${count} exercises, ${linkCount} equipment links, 0 validation errors.\n`);
process.stdout.write(sql);
