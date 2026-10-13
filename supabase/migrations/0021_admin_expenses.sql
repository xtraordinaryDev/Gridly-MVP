-- GridLink — operating expenses ledger (Admin → Expenses).
-- One row per thing the company pays for, with how much and how often.
-- Read and written only by server code after requireAdmin(); RLS on, no client policies.

create table if not exists public.admin_expenses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  vendor       text,
  category     text not null default 'other'
               check (category in ('software', 'ai_api', 'legal', 'insurance', 'people', 'marketing', 'office', 'travel', 'fees', 'other')),
  amount_cents integer not null check (amount_cents >= 0),
  frequency    text not null default 'monthly'
               check (frequency in ('one_time', 'weekly', 'monthly', 'quarterly', 'annual')),
  starts_on    date not null default current_date,
  ends_on      date,
  notes        text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists admin_expenses_active_idx on public.admin_expenses (is_active, category);

alter table public.admin_expenses enable row level security;
revoke all on public.admin_expenses from anon, authenticated;
