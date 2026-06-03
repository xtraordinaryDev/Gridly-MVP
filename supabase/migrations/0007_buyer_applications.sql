-- Buyer onboarding via approval queue.
--
-- Buyers now request access (instead of instant self-signup). Submissions land
-- in buyer_applications for admin review, mirroring vendor_applications. On
-- approval the buyer gets a token link to create their account.

create table public.buyer_applications (
  id                uuid primary key default gen_random_uuid(),
  invitation_token  text not null unique default encode(gen_random_bytes(24), 'hex'),
  status            public.application_status not null default 'pending_review',

  full_name         text not null,
  company_name      text not null,
  email             text not null,
  phone             text,
  industry          text,
  use_case          text,
  estimated_volume  text,

  submitted_at      timestamptz default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles (id),

  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index buyer_applications_status_idx on public.buyer_applications (status);
create index buyer_applications_is_demo_idx on public.buyer_applications (is_demo) where is_demo;

alter table public.buyer_applications enable row level security;

-- Public request submissions and approvals run via the service role (which
-- bypasses RLS). Authenticated browser access is limited to admins.
create policy "buyer applications: admin all" on public.buyer_applications
  for all using (public.is_admin()) with check (public.is_admin());
