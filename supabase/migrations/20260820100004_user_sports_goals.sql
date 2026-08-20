-- user_sports: which sports a user practices (private).
-- goals: a user's own free-text objectives (private). Deliberately a
-- single table, not a catalog+join pattern -- a goal's description is
-- personal text, not something shared/reused across users (evaluated
-- and rejected in the design audit). No `code`: no standalone URL,
-- deep-link, or AI write-tool addresses a goal individually.

create table public.user_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id text not null references public.sports (slug) on delete restrict,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  started_at date,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, sport_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id text references public.sports (slug) on delete set null,
  category text not null check (category in (
    'strength', 'muscle_gain', 'endurance', 'mobility',
    'sport_performance', 'general_fitness', 'consistency'
  )),
  description text not null,
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create index user_sports_user_idx on public.user_sports (user_id);
create index goals_user_status_idx on public.goals (user_id, status);

-- RLS ----------------------------------------------------------------

alter table public.user_sports enable row level security;
alter table public.goals enable row level security;

create policy "user_sports_select_own" on public.user_sports for select to authenticated
  using (user_id = (select auth.uid()));
create policy "user_sports_insert_own" on public.user_sports for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "user_sports_update_own" on public.user_sports for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_sports_delete_own" on public.user_sports for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "goals_select_own" on public.goals for select to authenticated
  using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.goals for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_sports to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant all on public.user_sports to service_role;
grant all on public.goals to service_role;
