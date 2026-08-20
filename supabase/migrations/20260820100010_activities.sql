-- activities: unstructured sport activity (padel, running, a match).
-- Structurally CANNOT advance a Plan -- there is no plan_item_id column
-- on this table at all, so "an activity never advances the rotation" is
-- a schema-level guarantee, not just an application convention.
--
-- duration_minutes is nullable per this task's explicit instruction (a
-- minor, deliberate relaxation from the earlier NOT NULL design -- a user
-- may log "played padel" without knowing the exact duration; nothing else
-- in the schema depends on it being present).

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_code('act'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id text not null references public.sports (slug) on delete restrict,
  performed_at timestamptz not null default now(),
  duration_minutes int check (duration_minutes > 0),
  perceived_intensity int check (perceived_intensity between 1 and 10),
  distance_km numeric(6, 2) check (distance_km >= 0),
  notes text,
  -- Only for data that is specific to one/few sports and is never
  -- filtered/sorted/computed on -- e.g. padel score, running splits. Any
  -- field a query needs to reason about belongs as a typed column instead.
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.activities
  for each row execute function public.prevent_code_update();

-- History / "recent activities". Filtering by sport reuses this same
-- index (WHERE sport_id = ...) rather than a dedicated one -- no
-- per-sport analytics query has been named as a requirement yet.
create index activities_user_history_idx
  on public.activities (user_id, performed_at desc);

-- RLS ----------------------------------------------------------------

alter table public.activities enable row level security;

create policy "activities_select_own" on public.activities for select to authenticated
  using (user_id = (select auth.uid()));
create policy "activities_insert_own" on public.activities for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "activities_update_own" on public.activities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "activities_delete_own" on public.activities for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
