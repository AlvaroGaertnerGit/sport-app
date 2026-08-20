-- workout_sessions: a real, dated execution of a routine or a free
-- session. started_at/completed_at are the source of truth for timing;
-- there is no stored duration_minutes -- it is always derived as
-- (completed_at - started_at) at read time, per the closed design.
--
-- plan_item_id/completion_type linkage is never inferred from routine_id.
-- It is set explicitly: automatically when a session is started from the
-- day's recommendation ("as_planned"), or only after an explicit user
-- confirmation when logging a different routine against the currently-due
-- slot ("substituted"). NULL/NULL means the session never touches the
-- Plan's rotation (spontaneous or free session).

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_code('ses'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  -- RESTRICT: see 0007's comment on plan_items.routine_id -- this is the
  -- other half of the same guarantee. A plan_item with real session
  -- history can never be deleted (and so neither can its parent plan),
  -- fully declaratively, no trigger required.
  plan_item_id uuid references public.plan_items (id) on delete restrict,
  completion_type text check (completion_type in ('as_planned', 'substituted')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  overall_rpe int check (overall_rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- plan_item_id and completion_type are only ever both null or both set --
  -- never inferring intent from routine_id (the closed planning rule).
  constraint workout_sessions_plan_link_coherent check (
    (plan_item_id is null and completion_type is null)
    or (plan_item_id is not null and completion_type is not null)
  ),
  -- A session linked to the plan always recorded some routine (even a
  -- substituted one) -- only a truly free/spontaneous session has no routine.
  constraint workout_sessions_plan_link_needs_routine check (
    plan_item_id is null or routine_id is not null
  ),
  -- completed_at is set if and only if the session is completed.
  constraint workout_sessions_completed_at_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  -- A session cannot end before it started.
  constraint workout_sessions_completed_after_started check (
    completed_at is null or completed_at >= started_at
  )
);

create trigger set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.workout_sessions
  for each row execute function public.prevent_code_update();

-- Concurrency guard: at most one in-progress session per user, enforced
-- atomically by Postgres -- not by an application-level check-then-insert,
-- which would have a race window. Opening two tabs and starting "today's
-- workout" in both can only ever create one in_progress row; the second
-- insert is rejected by this index. See project design docs for why this
-- is safe even without it (both would point at the same plan_item, so the
-- rotation itself never corrupts) -- this exists to prevent duplicate
-- history, not to protect the rotation algorithm.
create unique index workout_sessions_one_in_progress_per_user
  on public.workout_sessions (user_id)
  where (status = 'in_progress');

-- The single most important index in the schema: deriving "what's next"
-- means finding the most recent completed session linked to a given
-- plan_item. Every "what's next today" read hits this.
create index workout_sessions_plan_lookup_idx
  on public.workout_sessions (plan_item_id, status, started_at desc);

create index workout_sessions_user_history_idx
  on public.workout_sessions (user_id, started_at desc);

-- RLS ----------------------------------------------------------------

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_select_own" on public.workout_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- routine_id and plan_item_id are both private FKs (unlike exercise_id
-- elsewhere, which references the public catalog) -- both are checked so
-- a user can never log a session against another user's routine or plan
-- slot, even though the row itself would belong to them.
create policy "workout_sessions_insert_own" on public.workout_sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      routine_id is null
      or exists (select 1 from public.routines r where r.id = workout_sessions.routine_id and r.user_id = (select auth.uid()))
    )
    and (
      plan_item_id is null
      or exists (
        select 1 from public.plan_items pi
        join public.plans p on p.id = pi.plan_id
        where pi.id = workout_sessions.plan_item_id and p.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sessions_update_own" on public.workout_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      routine_id is null
      or exists (select 1 from public.routines r where r.id = workout_sessions.routine_id and r.user_id = (select auth.uid()))
    )
    and (
      plan_item_id is null
      or exists (
        select 1 from public.plan_items pi
        join public.plans p on p.id = pi.plan_id
        where pi.id = workout_sessions.plan_item_id and p.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sessions_delete_own" on public.workout_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.workout_sessions to authenticated;
grant all on public.workout_sessions to service_role;
