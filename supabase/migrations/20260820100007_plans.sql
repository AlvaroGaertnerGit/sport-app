-- plans: a user's rotation-based training strategy. Deliberately NO
-- current_position / current_index / cycle_number -- the next PlanItem is
-- always derived from workout_sessions history (see 0008 and project docs),
-- never stored as a mutable pointer.
-- plan_items: one rotation slot. No `code` -- always accessed through its
-- parent plan, never addressed independently.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.generate_code('pln'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.plans
  for each row execute function public.prevent_code_update();

-- Exactly one active plan per user, enforced declaratively (no trigger).
create unique index plans_one_active_per_user
  on public.plans (user_id)
  where (status = 'active');

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  -- RESTRICT (not the usual pattern): if a plan_item still has completed
  -- WorkoutSession history, Postgres itself refuses to delete it, and by
  -- extension refuses to cascade-delete the parent plan. Deleting a Plan
  -- only ever succeeds when none of its items were ever used -- otherwise
  -- the only allowed transition is archiving it. See 0008's FK on
  -- workout_sessions.plan_item_id for the other half of this guarantee.
  routine_id uuid not null references public.routines (id) on delete restrict,
  "order" int not null,
  unique (plan_id, "order")
);

-- RLS ----------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.plan_items enable row level security;

create policy "plans_select_own" on public.plans for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plans_insert_own" on public.plans for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "plans_update_own" on public.plans for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "plans_delete_own" on public.plans for delete to authenticated
  using (user_id = (select auth.uid()));

-- plan_items has TWO private FKs (plan_id, routine_id): a policy that only
-- checks the plan would let user A attach user B's routine to their own
-- plan. Both are checked on every write (audit finding, corrected here).
create policy "plan_items_select_own" on public.plan_items for select to authenticated
  using (exists (
    select 1 from public.plans p
    where p.id = plan_items.plan_id and p.user_id = (select auth.uid())
  ));
create policy "plan_items_insert_own" on public.plan_items for insert to authenticated
  with check (
    exists (select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.routines r where r.id = plan_items.routine_id and r.user_id = (select auth.uid()))
  );
create policy "plan_items_update_own" on public.plan_items for update to authenticated
  using (exists (
    select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = (select auth.uid())
  ))
  with check (
    exists (select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.routines r where r.id = plan_items.routine_id and r.user_id = (select auth.uid()))
  );
create policy "plan_items_delete_own" on public.plan_items for delete to authenticated
  using (exists (
    select 1 from public.plans p where p.id = plan_items.plan_id and p.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.plan_items to authenticated;
grant all on public.plans to service_role;
grant all on public.plan_items to service_role;
