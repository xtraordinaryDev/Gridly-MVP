-- GridLink — a buyer's saved-suppliers list ("Save to List" on a supplier profile).
-- Read and written only by server code after requireBuyer(), so RLS is enabled
-- with no client policies.
create table if not exists public.saved_suppliers (
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (buyer_id, vendor_id)
);

alter table public.saved_suppliers enable row level security;
