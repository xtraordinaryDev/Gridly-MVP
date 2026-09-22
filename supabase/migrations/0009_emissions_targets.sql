-- GridLink — buyer emissions reduction targets (Scope 1 from purchased fuel)
create table public.emissions_targets (
  buyer_id     uuid not null references public.profiles (id) on delete cascade,
  year         integer not null,
  target_tons  numeric(12, 2) not null check (target_tons >= 0),
  note         text,
  updated_at   timestamptz not null default now(),
  primary key (buyer_id, year)
);

alter table public.emissions_targets enable row level security;
create policy "emissions targets: owner" on public.emissions_targets
  for all using (buyer_id = auth.uid() or public.is_admin())
  with check (buyer_id = auth.uid() or public.is_admin());
