-- routines: user-owned reusable templates.
-- routine_exercises: ordered inclusion of an exercise in a routine, with
-- its own target (reps-based or duration-based -- not a universal
-- system for every conceivable modality).
--
-- No `difficulty`/`focus`/`estimated_duration`/`muscle_groups` columns on
-- routines: evaluated in the design audit and deferred (no consumer yet,
-- and muscle_groups is derivable from routine_exercises -> exercises
-- rather than duplicated).

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_code('rtn'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  primary_sport_id text references public.sports (slug) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.routines
  for each row execute function public.prevent_code_update();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  "order" int not null,
  target_sets int not null check (target_sets > 0),
  target_type text not null check (target_type in ('reps', 'duration')),
  target_reps_min int check (target_reps_min >= 0),
  target_reps_max int check (target_reps_max >= target_reps_min),
  target_duration_seconds int check (target_duration_seconds > 0),
  target_weight_kg numeric(6, 2) check (target_weight_kg >= 0),
  rest_seconds int check (rest_seconds >= 0),
  notes text,
  unique (routine_id, "order"),
  constraint routine_exercises_target_type_coherent check (
    (target_type = 'reps' and target_reps_min is not null)
    or (target_type = 'duration' and target_duration_seconds is not null)
  )
);

-- routine_id UNIQUE(routine_id, "order") already supplies the covering
-- index for "exercises of a routine in order" -- no separate index needed.
create index routines_user_idx on public.routines (user_id);

-- RLS ----------------------------------------------------------------

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;

create policy "routines_select_own" on public.routines for select to authenticated
  using (user_id = (select auth.uid()));
create policy "routines_insert_own" on public.routines for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "routines_update_own" on public.routines for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines_delete_own" on public.routines for delete to authenticated
  using (user_id = (select auth.uid()));

-- exercise_id references the PUBLIC exercises catalog -- no ownership
-- check needed there. routine_id is the only private FK on this table.
create policy "routine_exercises_select_own" on public.routine_exercises for select to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));
create policy "routine_exercises_insert_own" on public.routine_exercises for insert to authenticated
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));
create policy "routine_exercises_update_own" on public.routine_exercises for update to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));
create policy "routine_exercises_delete_own" on public.routine_exercises for delete to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_exercises.routine_id and r.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant all on public.routines to service_role;
grant all on public.routine_exercises to service_role;
