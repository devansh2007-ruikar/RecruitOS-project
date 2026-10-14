-- RecruitOS: Database Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
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
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  email_normalized text not null,
  branch        text not null,
  year          integer not null check (year between 1 and 5),
  team          text not null,
  answers       jsonb not null default '{}',
  status        application_status not null default 'applied',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Enforce one application per normalized email for this cycle
create unique index idx_applications_email_normalized
  on public.applications (email_normalized);

-- Index for dashboard queries
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
  actor_id        uuid, -- null for system/applicant actions
  created_at      timestamptz not null default now()
);

create index idx_status_history_application
  on public.status_history (application_id, created_at desc);

-- 5. Trigger: update updated_at on applications
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_application_updated
  before update on public.applications
  for each row
  execute function public.handle_updated_at();

-- 6. Row Level Security
-- ============================================================================

-- Applications: public can insert, only authenticated users can read/update
alter table public.applications enable row level security;

-- Allow anyone to insert an application (public form)
create policy "Anyone can apply"
  on public.applications for insert
  to anon, authenticated
  with check (true);

-- Only authenticated coordinators can read applications
create policy "Coordinators can read applications"
  on public.applications for select
  to authenticated
  using (true);

-- Only authenticated coordinators can update applications
create policy "Coordinators can update applications"
  on public.applications for update
  to authenticated
  using (true)
  with check (true);

-- Status history: authenticated can insert and read
alter table public.status_history enable row level security;

-- Allow service role and authenticated to insert audit entries
create policy "System can insert status history"
  on public.status_history for insert
  to authenticated
  with check (true);

-- Only authenticated coordinators can read history
create policy "Coordinators can read status history"
  on public.status_history for select
  to authenticated
  using (true);

-- 7. Function: Atomic status transition with audit
-- ============================================================================
create or replace function public.transition_application_status(
  p_application_id uuid,
  p_new_status application_status,
  p_actor_id uuid
)
returns jsonb as $$
declare
  v_current_status application_status;
  v_valid boolean := false;
begin
  -- Lock the row for update
  select status into v_current_status
  from public.applications
  where id = p_application_id
  for update;

  if v_current_status is null then
    return jsonb_build_object('success', false, 'error', 'Application not found');
  end if;

  -- Validate transition
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

  -- Update the application status
  update public.applications
  set status = p_new_status
  where id = p_application_id;

  -- Insert audit entry
  insert into public.status_history (application_id, previous_status, new_status, actor_id)
  values (p_application_id, v_current_status, p_new_status, p_actor_id);

  return jsonb_build_object('success', true, 'previous_status', v_current_status, 'new_status', p_new_status);
end;
$$ language plpgsql security definer;
