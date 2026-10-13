-- GridLink — investor / customer update list and send log (Admin → Updates).
--
-- update_contacts         who can receive company updates, with a type and a status
-- update_sends            one row per update sent from the admin console
-- update_send_recipients  per-recipient delivery result for a send
--
-- All three are read and written only by server code after requireAdmin()
-- (plus the public unsubscribe page, which uses the service role to flip one
-- status by token), so RLS is on with no client policies.

create table if not exists public.update_contacts (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  full_name          text,
  company            text,
  contact_type       text not null default 'other'
                     check (contact_type in ('investor', 'mentor', 'buyer', 'supplier', 'prospect', 'partner', 'other')),
  status             text not null default 'active'
                     check (status in ('active', 'paused', 'unsubscribed', 'bounced')),
  notes              text,
  unsubscribe_token  uuid not null default gen_random_uuid() unique,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- One row per address, whatever the capitalisation.
create unique index if not exists update_contacts_email_key on public.update_contacts (lower(email));
create index if not exists update_contacts_status_idx on public.update_contacts (status, contact_type);

create table if not exists public.update_sends (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  html             text not null,
  status           text not null default 'sending'
                   check (status in ('sending', 'sent', 'partial', 'failed')),
  recipient_count  integer not null default 0,
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  sent_by          uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create table if not exists public.update_send_recipients (
  id          uuid primary key default gen_random_uuid(),
  send_id     uuid not null references public.update_sends (id) on delete cascade,
  contact_id  uuid references public.update_contacts (id) on delete set null,
  email       text not null,
  full_name   text,
  status      text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  resend_id   text,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists update_send_recipients_send_idx on public.update_send_recipients (send_id);

alter table public.update_contacts         enable row level security;
alter table public.update_sends            enable row level security;
alter table public.update_send_recipients  enable row level security;
revoke all on public.update_contacts, public.update_sends, public.update_send_recipients from anon, authenticated;
