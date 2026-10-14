-- RecruitOS: Complete Initial Database Schema (Secured & Hardened)
-- Run this in the Supabase SQL Editor for new projects
-- ============================================================================

-- 1. Enable required extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- 2. Custom types
-- ============================================================================
create type application_status as enum (
  'applied',
  'shortlisted',
  'interview',
  'selected',
  'rejected'
);

-- 3. Applications table
-- ============================================================================
create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  email_normalized text not null,
  branch           text not null,
  year             integer not null check (year between 1 and 5),
  team             text not null,
  answers          jsonb not null default '{}',
  status           application_status not null default 'applied',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Enforce one application per normalized email for this recruitment cycle
create unique index idx_applications_email_normalized
  on public.applications (email_normalized);

-- Indexes for dashboard filtering and querying
create index idx_applications_status on public.applications (status);
create index idx_applications_team on public.applications (team);
create index idx_applications_created_at on public.applications (created_at desc);

-- 4. Status history (audit trail)
-- ============================================================================
create table public.status_history (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  previous_status application_status,
  new_status      application_status not null,
  actor_id        uuid, -- derived from auth.uid()
  created_at      timestamptz not null default now()
);

create index idx_status_history_application
  on public.status_history (application_id, created_at desc);

-- 5. Coordinators table (explicit authorization mechanism)
-- ============================================================================
create table public.coordinators (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'coordinator',
  created_at timestamptz not null default now()
);

-- 6. Helper functions (SECURITY DEFINER with safe search_path)
-- ============================================================================
create or replace function public.is_coordinator(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.coordinators
    where user_id = p_user_id
  );
$$;

revoke execute on function public.is_coordinator(uuid) from public;
grant execute on function public.is_coordinator(uuid) to authenticated;

-- Helper to authorize a coordinator by email
create or replace function public.add_coordinator(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'No auth user found with email ' || p_email);
  end if;

  insert into public.coordinators (user_id, email)
  values (v_user_id, lower(trim(p_email)))
  on conflict (user_id) do nothing;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
end;
$$;

-- Restrict execution to SQL Editor / Admin / Service Role only
revoke all on function public.add_coordinator(text) from public;
revoke all on function public.add_coordinator(text) from anon;
revoke all on function public.add_coordinator(text) from authenticated;

-- 7. Triggers: Force initial 'applied' status, email normalization & updated_at
-- ============================================================================
create or replace function public.handle_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.status := 'applied'::application_status;
  new.email_normalized := lower(trim(new.email));
  return new;
end;
$$;

create trigger on_application_insert
  before insert on public.applications
  for each row
  execute function public.handle_application_insert();

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if new.email is distinct from old.email then
    new.email_normalized := lower(trim(new.email));
  end if;
  return new;
end;
$$;

create trigger on_application_updated
  before update on public.applications
  for each row
  execute function public.handle_updated_at();

-- 8. Row Level Security
-- ============================================================================
alter table public.applications enable row level security;
alter table public.status_history enable row level security;
alter table public.coordinators enable row level security;

-- Applications: Anyone can apply; ONLY authorized coordinators can read.
create policy "Anyone can apply"
  on public.applications for insert
  to anon, authenticated
  with check (true);

create policy "Authorized coordinators can read applications"
  on public.applications for select
  to authenticated
  using (public.is_coordinator(auth.uid()));

-- NOTICE: No UPDATE policy on public.applications!
-- Status updates can ONLY occur through transition_application_status or bulk_transition_application_status.

-- Status history: ONLY authorized coordinators can read.
create policy "Authorized coordinators can read status history"
  on public.status_history for select
  to authenticated
  using (public.is_coordinator(auth.uid()));

-- NOTICE: No INSERT policy on status_history!
-- Audit entries can ONLY be inserted by the SECURITY DEFINER transition functions.

-- Coordinators: Coordinators can view coordinators list
create policy "Coordinators can view coordinators list"
  on public.coordinators for select
  to authenticated
  using (auth.uid() = user_id);

-- 9. Atomic Status Transition Function (Single)
-- ============================================================================
create or replace function public.transition_application_status(
  p_application_id uuid,
  p_new_status application_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_current_status application_status;
  v_valid boolean := false;
begin
  -- 1. Authorization check
  if v_actor_id is null or not public.is_coordinator(v_actor_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: caller is not an authorized coordinator'
    );
  end if;

  -- 2. Lock row for update
  select status into v_current_status
  from public.applications
  where id = p_application_id
  for update;

  if v_current_status is null then
    return jsonb_build_object('success', false, 'error', 'Application not found');
  end if;

  -- 3. Validate transition
  v_valid := case
    when v_current_status = 'applied' and p_new_status in ('shortlisted', 'rejected') then true
    when v_current_status = 'shortlisted' and p_new_status in ('interview', 'rejected') then true
    when v_current_status = 'interview' and p_new_status in ('selected', 'rejected') then true
    else false
  end;

  if not v_valid then
    return jsonb_build_object(
      'success', false,
      'error', format('Invalid transition: %s → %s', v_current_status, p_new_status)
    );
  end if;

  -- 4. Update status atomically
  update public.applications
  set status = p_new_status
  where id = p_application_id;

  -- 5. Insert audit entry with verified auth.uid()
  insert into public.status_history (application_id, previous_status, new_status, actor_id)
  values (p_application_id, v_current_status, p_new_status, v_actor_id);

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

revoke execute on function public.transition_application_status(uuid, application_status) from public;
grant execute on function public.transition_application_status(uuid, application_status) to authenticated;

-- 10. Atomic Status Transition Function (Bulk - All or Nothing)
-- ============================================================================
create or replace function public.bulk_transition_application_status(
  p_application_ids uuid[],
  p_new_status application_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_app record;
  v_valid boolean;
  v_count integer := 0;
  v_found_count integer := 0;
  v_expected_count integer;
begin
  -- 1. Authorization check
  if v_actor_id is null or not public.is_coordinator(v_actor_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: caller is not an authorized coordinator'
    );
  end if;

  -- 2. Validate input array
  if p_application_ids is null or array_length(p_application_ids, 1) is null or array_length(p_application_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'No candidate IDs provided');
  end if;

  v_expected_count := array_length(p_application_ids, 1);

  -- 3. Verify that all candidates exist in database
  select count(distinct id) into v_found_count
  from public.applications
  where id = any(p_application_ids);

  if v_found_count <> v_expected_count then
    return jsonb_build_object(
      'success', false,
      'error', format('Batch rejected: expected %s candidates, but found %s in database', v_expected_count, v_found_count)
    );
  end if;

  -- 4. Check that every candidate can transition to p_new_status
  for v_app in
    select id, name, status
    from public.applications
    where id = any(p_application_ids)
    for update
  loop
    v_valid := case
      when v_app.status = 'applied' and p_new_status in ('shortlisted', 'rejected') then true
      when v_app.status = 'shortlisted' and p_new_status in ('interview', 'rejected') then true
      when v_app.status = 'interview' and p_new_status in ('selected', 'rejected') then true
      else false
    end;

    if not v_valid then
      return jsonb_build_object(
        'success', false,
        'error', format('Batch rejected: candidate "%s" with status "%s" cannot transition to "%s"', v_app.name, v_app.status, p_new_status)
      );
    end if;
  end loop;

  -- 5. Execute all updates and write one audit entry per successful change
  for v_app in
    select id, status
    from public.applications
    where id = any(p_application_ids)
  loop
    update public.applications
    set status = p_new_status
    where id = v_app.id;

    insert into public.status_history (application_id, previous_status, new_status, actor_id)
    values (v_app.id, v_app.status, p_new_status, v_actor_id);

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'count', v_count,
    'new_status', p_new_status
  );
end;
$$;

revoke execute on function public.bulk_transition_application_status(uuid[], application_status) from public;
grant execute on function public.bulk_transition_application_status(uuid[], application_status) to authenticated;
