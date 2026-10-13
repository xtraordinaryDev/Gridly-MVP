-- GridLink — metered AI token usage and the official Anthropic cost report.
--
-- ai_usage         one row per model call the app makes (tokens + list-price cost)
-- ai_cost_daily    one row per day from Anthropic's cost report, when ANTHROPIC_ADMIN_KEY is set
--
-- Written by server code only; RLS on, no client policies.

create table if not exists public.ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  feature             text not null,
  model               text not null,
  user_id             uuid references public.profiles (id) on delete set null,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  cache_read_tokens   integer not null default 0,
  cache_write_tokens  integer not null default 0,
  cost_microdollars   bigint not null default 0,   -- 1,000,000 = $1.00, keeps sub-cent calls exact
  ok                  boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_feature_idx on public.ai_usage (feature, created_at desc);

create table if not exists public.ai_cost_daily (
  day                 date not null,
  description         text not null default 'total',
  amount_microdollars bigint not null default 0,
  fetched_at          timestamptz not null default now(),
  primary key (day, description)
);

alter table public.ai_usage      enable row level security;
alter table public.ai_cost_daily enable row level security;
revoke all on public.ai_usage, public.ai_cost_daily from anon, authenticated;
