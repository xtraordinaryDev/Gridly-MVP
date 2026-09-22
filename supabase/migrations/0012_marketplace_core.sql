-- GridLink — marketplace core: pricing modes, per-site quantities, attachments,
-- orders + deliveries, messaging, supplier ratings, reminder log, storage.

-- Pricing: fixed $/gal or index + differential -------------------------------
alter table public.rfps
  add column if not exists pricing_mode text not null default 'fixed' check (pricing_mode in ('fixed', 'index')),
  add column if not exists index_name text,
  add column if not exists delivery_sites jsonb not null default '[]'::jsonb,   -- [{address, gallons, tankSizeGallons, deliveryWindow}]
  add column if not exists attachments jsonb not null default '[]'::jsonb;      -- [{name, path, size}]

alter table public.rfp_responses
  add column if not exists pricing_mode text not null default 'fixed' check (pricing_mode in ('fixed', 'index')),
  add column if not exists index_name text,
  add column if not exists differential numeric(10, 4),
  add column if not exists attachment_path text;

alter table public.contracts
  add column if not exists pricing_mode text not null default 'fixed' check (pricing_mode in ('fixed', 'index')),
  add column if not exists index_name text,
  add column if not exists differential numeric(10, 4);

alter table public.invoice_line_items
  add column if not exists index_price numeric(10, 4),
  add column if not exists delivery_id uuid;

-- Orders + deliveries ---------------------------------------------------------
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references public.contracts (id) on delete cascade,
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  vendor_id     uuid not null references public.vendors (id) on delete cascade,
  site_address  text not null,
  gallons       numeric(12, 2) not null check (gallons > 0),
  window_start  date not null,
  window_end    date not null,
  urgency       text not null default 'standard' check (urgency in ('standard', 'rush', 'emergency')),
  notes         text,
  status        text not null default 'requested' check (status in ('requested', 'confirmed', 'scheduled', 'delivered', 'cancelled')),
  scheduled_for date,
  confirmed_at  timestamptz,
  cancelled_reason text,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index orders_contract_idx on public.orders (contract_id, status);
create index orders_vendor_idx on public.orders (vendor_id, status);
create index orders_buyer_idx on public.orders (buyer_id, status);

create table public.deliveries (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders (id) on delete set null,
  contract_id    uuid not null references public.contracts (id) on delete cascade,
  buyer_id       uuid not null references public.profiles (id) on delete cascade,
  vendor_id      uuid not null references public.vendors (id) on delete cascade,
  delivered_at   date not null,
  site_address   text not null,
  gallons        numeric(12, 2) not null check (gallons > 0),
  ticket_number  text,
  bol_path       text,
  notes          text,
  on_time        boolean,
  invoice_id     uuid references public.invoices (id) on delete set null,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index deliveries_contract_idx on public.deliveries (contract_id, delivered_at);
create index deliveries_unbilled_idx on public.deliveries (vendor_id) where invoice_id is null;

alter table public.invoice_line_items
  add constraint invoice_line_items_delivery_fk foreign key (delivery_id) references public.deliveries (id) on delete set null;

-- Messaging -------------------------------------------------------------------
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  thread_type   text not null check (thread_type in ('rfp', 'contract', 'invoice')),
  thread_id     uuid not null,                     -- rfp / contract / invoice id
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  vendor_id     uuid references public.vendors (id) on delete cascade,   -- null = broadcast to all invited (rfp only)
  sender_role   text not null check (sender_role in ('buyer', 'vendor', 'admin')),
  sender_id     uuid,
  body          text not null,
  is_broadcast  boolean not null default false,
  read_by_buyer boolean not null default false,
  read_by_vendor boolean not null default false,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_type, thread_id, created_at);
create index messages_vendor_idx on public.messages (vendor_id, created_at);
create index messages_buyer_idx on public.messages (buyer_id, created_at);

-- Supplier ratings ------------------------------------------------------------
create table public.supplier_ratings (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null unique references public.contracts (id) on delete cascade,
  buyer_id     uuid not null references public.profiles (id) on delete cascade,
  vendor_id    uuid not null references public.vendors (id) on delete cascade,
  stars        integer not null check (stars between 1 and 5),
  comment      text,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index supplier_ratings_vendor_idx on public.supplier_ratings (vendor_id);

-- Reminder log (cron idempotency) -------------------------------------------
create table public.reminder_log (
  kind      text not null,
  ref_id    uuid not null,
  sent_on   date not null default current_date,
  primary key (kind, ref_id, sent_on)
);

-- RLS: reads for parties; writes go through server actions (service role) ----
alter table public.orders           enable row level security;
alter table public.deliveries       enable row level security;
alter table public.messages         enable row level security;
alter table public.supplier_ratings enable row level security;
alter table public.reminder_log     enable row level security;

create policy "orders: parties read" on public.orders for select
  using (public.is_admin() or buyer_id = auth.uid() or vendor_id = public.current_vendor_id());
create policy "deliveries: parties read" on public.deliveries for select
  using (public.is_admin() or buyer_id = auth.uid() or vendor_id = public.current_vendor_id());
create policy "messages: parties read" on public.messages for select
  using (public.is_admin() or buyer_id = auth.uid() or vendor_id = public.current_vendor_id()
         or (is_broadcast and public.vendor_is_invited(thread_id)));
create policy "ratings: read" on public.supplier_ratings for select using (true);

-- Storage: RFP/bid attachments and delivery BOLs (private; signed URLs) -------
insert into storage.buckets (id, name, public) values ('rfp-attachments', 'rfp-attachments', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('delivery-docs', 'delivery-docs', false) on conflict (id) do nothing;
create policy "rfp-attachments: authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'rfp-attachments');
create policy "rfp-attachments: authenticated read" on storage.objects for select to authenticated using (bucket_id = 'rfp-attachments');
create policy "delivery-docs: authenticated upload" on storage.objects for insert to authenticated with check (bucket_id = 'delivery-docs');
create policy "delivery-docs: authenticated read" on storage.objects for select to authenticated using (bucket_id = 'delivery-docs');
