-- sports / equipment: small, admin-managed reference catalogs.
-- slug IS the public identifier (stable, unique, human-readable) -- no
-- separate surrogate id/code needed, unlike user-owned domain entities.

create table public.sports (
  slug text primary key,
  name text not null,
  description text,
  default_muscle_groups text[] not null default '{}',
  icon text,
  is_active boolean not null default true,
  constraint sports_default_muscle_groups_valid check (
    default_muscle_groups <@ array[
      'chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps', 'forearms',
      'core', 'glutes', 'quadriceps', 'hamstrings', 'calves'
    ]::text[]
  )
);

create table public.equipment (
  slug text primary key,
  name text not null,
  icon text,
  is_active boolean not null default true
);

-- RLS ----------------------------------------------------------------
-- Public reference data: every authenticated user can SELECT. No
-- INSERT/UPDATE/DELETE policy exists for `authenticated` -- catalog
-- writes only happen via service_role (server-side admin path), which
-- bypasses RLS entirely. This IS the "admin architecture" for catalogs
-- until a real admin-role system exists.

alter table public.sports enable row level security;
alter table public.equipment enable row level security;

create policy "sports_select_all"
  on public.sports for select
  to authenticated
  using (true);

create policy "equipment_select_all"
  on public.equipment for select
  to authenticated
  using (true);

grant select on public.sports to authenticated;
grant select on public.equipment to authenticated;
grant all on public.sports to service_role;
grant all on public.equipment to service_role;
