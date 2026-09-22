-- GridLink — Invoicing (phase 1)
--
-- Contracts are created when a buyer awards an RFP. Vendors build invoices
-- against a contract, send them (PDF + emailed link), and both sides track
-- status, disputes, and payments. Payments are provider-ready (Stripe later)
-- but recorded manually for now.

create type public.invoice_status as enum (
  'draft', 'sent', 'viewed', 'disputed', 'partially_paid', 'paid', 'void'
);
create type public.payment_method as enum ('ach', 'check', 'wire', 'card', 'other');
create type public.invoice_line_kind as enum ('fuel', 'fee', 'tax', 'credit');
create type public.invoice_event_type as enum (
  'created', 'sent', 'viewed', 'disputed', 'dispute_resolved',
  'payment_recorded', 'paid', 'voided', 'reminder_sent', 'note'
);

-- ---------------------------------------------------------------------------
-- contracts
-- ---------------------------------------------------------------------------
create table public.contracts (
  id                 uuid primary key default gen_random_uuid(),
  rfp_id             uuid not null references public.rfps (id) on delete cascade,
  buyer_id           uuid not null references public.profiles (id) on delete cascade,
  vendor_id          uuid not null references public.vendors (id) on delete cascade,
  title              text not null,
  fuel_type          text,
  quantity_gallons   bigint,
  price_per_gallon   numeric(10, 4),
  delivery_terms     text,
  net_days           integer not null default 30,
  status             text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  awarded_at         timestamptz not null default now(),
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (rfp_id)
);
create index contracts_buyer_idx on public.contracts (buyer_id);
create index contracts_vendor_idx on public.contracts (vendor_id);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table public.invoice_counters (
  vendor_id  uuid primary key references public.vendors (id) on delete cascade,
  last_seq   integer not null default 0
);

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references public.contracts (id) on delete cascade,
  buyer_id         uuid not null references public.profiles (id) on delete cascade,
  vendor_id        uuid not null references public.vendors (id) on delete cascade,
  seq              integer not null,
  number           text not null,
  status           public.invoice_status not null default 'draft',
  issue_date       date not null default current_date,
  due_date         date not null,
  subtotal         numeric(14, 2) not null default 0,
  fees_total       numeric(14, 2) not null default 0,
  tax_total        numeric(14, 2) not null default 0,
  total            numeric(14, 2) not null default 0,
  amount_paid      numeric(14, 2) not null default 0,
  notes            text,
  pdf_path         text,
  view_token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  sent_at          timestamptz,
  viewed_at        timestamptz,
  disputed_at      timestamptz,
  dispute_reason   text,
  paid_at          timestamptz,
  voided_at        timestamptz,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (vendor_id, seq)
);
create index invoices_buyer_idx on public.invoices (buyer_id, status);
create index invoices_vendor_idx on public.invoices (vendor_id, status);
create index invoices_due_idx on public.invoices (due_date);

create table public.invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices (id) on delete cascade,
  position         integer not null default 0,
  kind             public.invoice_line_kind not null default 'fuel',
  description      text not null,
  delivery_date    date,
  ticket_number    text,
  gallons          numeric(12, 2),
  price_per_gallon numeric(10, 4),
  amount           numeric(14, 2) not null default 0
);
create index invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id);

create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices (id) on delete cascade,
  amount         numeric(14, 2) not null check (amount > 0),
  method         public.payment_method not null default 'ach',
  reference      text,
  paid_at        date not null default current_date,
  recorded_by    uuid references public.profiles (id),
  recorded_role  public.user_role,
  provider       text,          -- e.g. 'stripe' (phase 2)
  provider_ref   text,          -- e.g. payment intent id (phase 2)
  note           text,
  created_at     timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);

create table public.invoice_events (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  type         public.invoice_event_type not null,
  actor_id     uuid references public.profiles (id),
  actor_role   text,            -- 'buyer' | 'vendor' | 'admin' | 'system' | 'link'
  message      text,
  amount       numeric(14, 2),
  created_at   timestamptz not null default now()
);
create index invoice_events_invoice_idx on public.invoice_events (invoice_id, created_at);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
-- Per-vendor sequential invoice numbers, e.g. APX-0042.
create or replace function public.next_invoice_seq(p_vendor_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_seq integer;
begin
  insert into public.invoice_counters (vendor_id, last_seq)
  values (p_vendor_id, 1)
  on conflict (vendor_id) do update set last_seq = invoice_counters.last_seq + 1
  returning last_seq into v_seq;
  return v_seq;
end;
$$;

create or replace function public.can_view_invoice(p_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invoices i
    where i.id = p_invoice_id
      and (i.buyer_id = auth.uid() or i.vendor_id = public.current_vendor_id())
  ) or public.is_admin();
$$;

create or replace function public.touch_invoice_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_invoice_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — reads through the session client; writes go through server actions
-- (service role) after explicit ownership checks, plus vendor write policies
-- for their own drafts.
-- ---------------------------------------------------------------------------
alter table public.contracts          enable row level security;
alter table public.invoice_counters   enable row level security;
alter table public.invoices           enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments           enable row level security;
alter table public.invoice_events     enable row level security;

create policy "contracts: parties read" on public.contracts
  for select using (
    public.is_admin() or buyer_id = auth.uid() or vendor_id = public.current_vendor_id()
  );

create policy "invoices: parties read" on public.invoices
  for select using (
    public.is_admin() or buyer_id = auth.uid() or vendor_id = public.current_vendor_id()
  );
create policy "invoices: vendor write" on public.invoices
  for all using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

create policy "line items: parties read" on public.invoice_line_items
  for select using (public.can_view_invoice(invoice_id));
create policy "line items: vendor write" on public.invoice_line_items
  for all using (
    exists (select 1 from public.invoices i where i.id = invoice_id and i.vendor_id = public.current_vendor_id())
  )
  with check (
    exists (select 1 from public.invoices i where i.id = invoice_id and i.vendor_id = public.current_vendor_id())
  );

create policy "payments: parties read" on public.payments
  for select using (public.can_view_invoice(invoice_id));

create policy "invoice events: parties read" on public.invoice_events
  for select using (public.can_view_invoice(invoice_id));

-- ---------------------------------------------------------------------------
-- storage: invoice PDFs (private; served via signed URLs from the server)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;
