-- GridLink — audit trail for admin actions on vendor applications.

create type public.application_action as enum (
  'invited',
  'approved',
  'info_requested',
  'rejected',
  'note'
);

create table public.application_activity_log (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.vendor_applications (id) on delete cascade,
  admin_id        uuid references public.profiles (id),
  action          public.application_action not null,
  notes           text,
  created_at      timestamptz not null default now()
);

create index application_activity_log_application_idx
  on public.application_activity_log (application_id, created_at desc);

alter table public.application_activity_log enable row level security;

-- Only admins can read/write the activity log.
create policy "activity log: admin all" on public.application_activity_log
  for all using (public.is_admin()) with check (public.is_admin());
