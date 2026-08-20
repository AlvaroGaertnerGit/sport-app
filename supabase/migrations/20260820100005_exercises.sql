-- exercises: shared, sport-agnostic exercise library (public read-only
-- for regular users). exercise_equipment: many-to-many with real FK
-- integrity, replacing an earlier array-of-slugs idea from the design
-- audit (arrays can't carry FKs; this join table can).

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_code('ex'),
  slug text not null unique,
  name text not null,
  description text,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  movement_pattern text not null check (movement_pattern in (
    'push', 'pull', 'squat', 'hinge', 'carry', 'rotation', 'locomotion', 'core'
  )),
  primary_muscles text[] not null,
  secondary_muscles text[] not null default '{}',
  instructions text not null,
  common_mistakes text,
  easier_variant_id uuid references public.exercises (id) on delete set null,
  harder_variant_id uuid references public.exercises (id) on delete set null,
  image_url text,
  video_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- cardinality(), not array_length(): array_length() returns NULL (not 0)
  -- for an empty array, which a CHECK would silently treat as satisfied.
  constraint exercises_primary_muscles_not_empty check (cardinality(primary_muscles) >= 1),
  constraint exercises_primary_muscles_valid check (
    primary_muscles <@ array[
      'chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'glutes', 'quadriceps', 'hamstrings', 'calves'
    ]::text[]
  ),
  constraint exercises_secondary_muscles_valid check (
    secondary_muscles <@ array[
      'chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'glutes', 'quadriceps', 'hamstrings', 'calves'
    ]::text[]
  )
);

create trigger set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.exercises
  for each row execute function public.prevent_code_update();

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_slug text not null references public.equipment (slug) on delete restrict,
  primary key (exercise_id, equipment_slug)
);

-- Substitution search ("Pike Push Up -> alternatives") and library
-- browsing/filtering -- named product requirements, not speculative.
create index exercises_movement_pattern_idx on public.exercises (movement_pattern);
create index exercises_primary_muscles_gin on public.exercises using gin (primary_muscles);
create index exercise_equipment_by_equipment_idx on public.exercise_equipment (equipment_slug);

-- RLS ----------------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.exercise_equipment enable row level security;

create policy "exercises_select_all" on public.exercises for select to authenticated using (true);
create policy "exercise_equipment_select_all" on public.exercise_equipment for select to authenticated using (true);
-- No write policies for `authenticated` -- service_role only, same as sports/equipment.

grant select on public.exercises to authenticated;
grant select on public.exercise_equipment to authenticated;
grant all on public.exercises to service_role;
grant all on public.exercise_equipment to service_role;
