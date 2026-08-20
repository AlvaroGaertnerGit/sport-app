-- profiles: app-level identity layered on Supabase Auth.
-- id is NOT a fresh surrogate key — it IS auth.users.id, never duplicated.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique default public.generate_code('usr'),
  display_name text,
  timezone text not null default 'UTC',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger prevent_code_update
  before update on public.profiles
  for each row execute function public.prevent_code_update();

-- auth.users -> profiles sync. SECURITY DEFINER + empty search_path +
-- fully-qualified names is the pattern documented by Supabase for this
-- exact use case (verified via Context7).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS --------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT policy: rows are created exclusively by the on_auth_user_created
-- trigger (SECURITY DEFINER, bypasses RLS). No DELETE policy: account
-- deletion goes through the Auth Admin API (service_role), never a direct
-- client DELETE on this table.

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
