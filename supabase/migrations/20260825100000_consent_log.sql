-- consent_log: append-only audit trail of what a user accepted, when, and
-- which version of the document -- the minimal evidence needed to
-- demonstrate consent (RGPD art. 7.1 "el responsable deberá poder
-- demostrar" + LSSI). Deliberately NOT a column on profiles: profiles is
-- one of the closed 12 domain entities and this is compliance
-- infrastructure, not a trait of a user's training profile -- keeping it
-- separate also gives a real history (a user can accept a new Terms
-- version later; a column would only ever hold the latest).
--
-- Insert-only by design: no UPDATE/DELETE policy for `authenticated` at
-- all, so a row, once written, cannot be edited or removed by the user it
-- belongs to -- that immutability is the whole point of an audit trail.
-- service_role (used by the future account-deletion flow) can still
-- remove rows as part of deleting a user's data entirely.

create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms_and_privacy')),
  version text not null,
  accepted_at timestamptz not null default now()
);

create index consent_log_user_idx on public.consent_log (user_id, consent_type, accepted_at desc);

-- RLS ----------------------------------------------------------------

alter table public.consent_log enable row level security;

create policy "consent_log_select_own" on public.consent_log for select to authenticated
  using (user_id = (select auth.uid()));

create policy "consent_log_insert_own" on public.consent_log for insert to authenticated
  with check (user_id = (select auth.uid()));

-- No UPDATE/DELETE policy for `authenticated` -- see file comment.

grant select, insert on public.consent_log to authenticated;
grant all on public.consent_log to service_role;
