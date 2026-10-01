-- GridLink — regional fuel price benchmarks (EIA weekly retail averages).
-- Refreshed by the daily cron; read by the buyer dashboard. Prices are public
-- data, so any signed-in user may read; writes are service-role only.
create table public.fuel_price_snapshots (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,                         -- 'eia' (later: 'google_places', 'opis')
  scope       text not null check (scope in ('region', 'state', 'station')),
  scope_key   text not null,                         -- EIA area code (NUS, R20, STX, ...) or a station id
  area_label  text not null,                         -- "Midwest (PADD 2)", "Texas", ...
  fuel_type   text not null,                         -- 'diesel' | 'gasoline_regular'
  price       numeric(6,3) not null,                 -- $/gal
  observed_at date not null,                         -- EIA "period" (week start)
  fetched_at  timestamptz not null default now(),
  unique (source, scope_key, fuel_type, observed_at)
);
create index fuel_price_snapshots_lookup_idx
  on public.fuel_price_snapshots (scope_key, fuel_type, observed_at desc);

alter table public.fuel_price_snapshots enable row level security;
create policy "fuel prices: authenticated read" on public.fuel_price_snapshots
  for select to authenticated using (true);
