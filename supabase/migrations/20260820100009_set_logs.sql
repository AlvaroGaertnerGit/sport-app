-- set_logs: what actually happened in one set of a workout session. This
-- is the self-contained snapshot that keeps history correct even if the
-- parent Routine's targets change later (no routine versioning needed --
-- see project design docs).

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  "order" int not null check ("order" >= 1),
  reps int check (reps >= 0),
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  duration_seconds int check (duration_seconds >= 0),
  perceived_effort int check (perceived_effort between 1 and 10),
  notes text,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same ordering guarantee as routine_exercises/plan_items -- not
  -- explicitly requested by name, but a direct extension of "order
  -- válido" consistent with the rest of the schema.
  unique (workout_session_id, "order")
);

create trigger set_updated_at
  before update on public.set_logs
  for each row execute function public.set_updated_at();

-- Progress-over-time for one exercise, scoped to a user via the join to
-- workout_sessions. Denormalizing user_id onto set_logs to avoid that join
-- was considered and rejected in the design audit -- not justified at
-- this product's expected data volume.
create index set_logs_progress_idx
  on public.set_logs (exercise_id, workout_session_id);

-- RLS ----------------------------------------------------------------

alter table public.set_logs enable row level security;

-- exercise_id references the public exercises catalog -- no ownership
-- check needed. workout_session_id is the only private FK.
create policy "set_logs_select_own" on public.set_logs for select to authenticated
  using (exists (
    select 1 from public.workout_sessions ws
    where ws.id = set_logs.workout_session_id and ws.user_id = (select auth.uid())
  ));
create policy "set_logs_insert_own" on public.set_logs for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions ws
    where ws.id = set_logs.workout_session_id and ws.user_id = (select auth.uid())
  ));
create policy "set_logs_update_own" on public.set_logs for update to authenticated
  using (exists (
    select 1 from public.workout_sessions ws
    where ws.id = set_logs.workout_session_id and ws.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions ws
    where ws.id = set_logs.workout_session_id and ws.user_id = (select auth.uid())
  ));
create policy "set_logs_delete_own" on public.set_logs for delete to authenticated
  using (exists (
    select 1 from public.workout_sessions ws
    where ws.id = set_logs.workout_session_id and ws.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.set_logs to authenticated;
grant all on public.set_logs to service_role;
