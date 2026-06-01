-- RFP module extensions for buyer wizard, timelines, and invitation decline tracking

alter table public.rfps
  add column if not exists recurrence text,
  add column if not exists urgency text default 'standard',
  add column if not exists delivery_addresses text[] not null default '{}',
  add column if not exists delivery_dates date[] not null default '{}',
  add column if not exists insurance_requirements text,
  add column if not exists decision_date timestamptz,
  add column if not exists expected_award_date timestamptz,
  add column if not exists published_at timestamptz;

alter table public.rfp_invitations
  add column if not exists declined_at timestamptz;

alter table public.rfp_responses
  add column if not exists attachment_name text;
