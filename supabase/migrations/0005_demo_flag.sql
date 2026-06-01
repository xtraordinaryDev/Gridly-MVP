-- Demo seed flag — scripts/seed-demo.ts sets is_demo = true for idempotent cleanup.

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

alter table public.vendor_applications
  add column if not exists is_demo boolean not null default false;

alter table public.vendors
  add column if not exists is_demo boolean not null default false;

alter table public.buyer_organizations
  add column if not exists is_demo boolean not null default false;

alter table public.rfps
  add column if not exists is_demo boolean not null default false;

create index if not exists profiles_is_demo_idx on public.profiles (is_demo) where is_demo;
create index if not exists vendors_is_demo_idx on public.vendors (is_demo) where is_demo;
create index if not exists vendor_applications_is_demo_idx on public.vendor_applications (is_demo) where is_demo;
create index if not exists rfps_is_demo_idx on public.rfps (is_demo) where is_demo;
