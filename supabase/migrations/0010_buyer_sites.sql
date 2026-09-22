-- GridLink — saved delivery sites for buyers (pre-populated address picker in the RFP wizard)
create table public.buyer_sites (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  address     text not null,
  state       text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index buyer_sites_buyer_idx on public.buyer_sites (buyer_id);

alter table public.buyer_sites enable row level security;
create policy "buyer sites: owner" on public.buyer_sites
  for all using (buyer_id = auth.uid() or public.is_admin())
  with check (buyer_id = auth.uid() or public.is_admin());
