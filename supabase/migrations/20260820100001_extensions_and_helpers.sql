-- Extensions -----------------------------------------------------------

create extension if not exists "pgcrypto" with schema "extensions";

-- Generic helper functions (infrastructure, not domain logic) ---------

-- Public code generator: "<prefix>_<18 hex chars>" from 9 cryptographically
-- random bytes (72 bits of entropy). Verified against pgcrypto's
-- gen_random_bytes() and core Postgres encode() — no custom Base62 encoder,
-- no invented function (see design audit).
create or replace function public.generate_code(prefix text)
returns text
language sql
volatile
as $$
  select prefix || '_' || encode(extensions.gen_random_bytes(9), 'hex');
$$;

-- Generic "touch updated_at" trigger, reused by every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generic "code is immutable" trigger, reused by every table with a
-- public code column. Not domain logic — a data-integrity utility.
create or replace function public.prevent_code_update()
returns trigger
language plpgsql
as $$
begin
  if new.code is distinct from old.code then
    raise exception 'code is immutable and cannot be changed (table: %, id: %)',
      tg_table_name, old.id;
  end if;
  return new;
end;
$$;

-- New tables/functions are NOT reachable via the Data API without explicit
-- GRANTs (current Supabase default, verified against the CLI source and
-- official RLS guide). generate_code() is invoked as a column DEFAULT
-- during INSERT, so the inserting role needs EXECUTE on it -- and, since
-- generate_code() is a plain (invoker-rights) function, the same role
-- also needs USAGE on the extensions schema and EXECUTE on the pgcrypto
-- function it calls internally. Granted explicitly rather than assumed,
-- since pgcrypto's own default privileges are not something this project
-- controls or can verify without a live database.
grant usage on schema extensions to authenticated, service_role;
grant execute on function extensions.gen_random_bytes(integer) to authenticated, service_role;
grant execute on function public.generate_code(text) to authenticated, service_role;
grant execute on function public.set_updated_at() to authenticated, service_role;
grant execute on function public.prevent_code_update() to authenticated, service_role;
