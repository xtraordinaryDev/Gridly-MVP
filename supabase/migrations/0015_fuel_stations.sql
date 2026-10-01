-- GridLink — station-level fuel prices near buyer sites (Google Places fuelOptions).
-- Sites are geocoded once; stations are fetched per ~5-mile grid cell by the daily
-- cron so two sites in the same town share one lookup.

alter table public.buyer_sites
  add column lat          double precision,
  add column lng          double precision,
  add column postal_code  text,
  add column geo_cell     text,               -- see src/lib/fuel-prices/geo.ts
  add column geocoded_at  timestamptz;
create index buyer_sites_geo_cell_idx on public.buyer_sites (geo_cell) where geo_cell is not null;

-- One row per grid cell we've ever needed; drives refresh cadence and cost caps.
create table public.fuel_station_cells (
  geo_cell       text primary key,
  lat            double precision not null,   -- cell center
  lng            double precision not null,
  fetched_at     timestamptz,
  station_count  integer not null default 0,
  last_error     text
);

-- Latest known price per station per fuel.
create table public.fuel_station_prices (
  place_id     text not null,                 -- Google place id
  fuel_type    text not null,                 -- 'diesel' | 'gasoline_regular'
  geo_cell     text not null references public.fuel_station_cells (geo_cell) on delete cascade,
  name         text not null,
  address      text,
  lat          double precision not null,
  lng          double precision not null,
  price        numeric(6,3) not null,         -- $/gal
  observed_at  timestamptz,                   -- Google's updateTime for the price
  fetched_at   timestamptz not null default now(),
  primary key (place_id, fuel_type)
);
create index fuel_station_prices_cell_idx on public.fuel_station_prices (geo_cell, fuel_type);

alter table public.fuel_station_cells  enable row level security;
alter table public.fuel_station_prices enable row level security;
create policy "station prices: authenticated read" on public.fuel_station_prices
  for select to authenticated using (true);
