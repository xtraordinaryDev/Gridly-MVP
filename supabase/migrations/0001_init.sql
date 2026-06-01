-- GridLink — initial schema
-- Procurement operating system for fuel: buyers, verified vendors, RFPs.
-- All tables have RLS enabled. Token-gated / public-form writes are expected
-- to go through server routes using the Supabase service role key, which
-- bypasses RLS. Browser clients are constrained by the policies below.

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------------
create type public.user_role as enum ('buyer', 'vendor', 'admin');
create type public.application_status as enum ('pending_review', 'approved', 'rejected', 'info_requested');
create type public.application_source as enum ('invited', 'self_applied');
create type public.document_type as enum ('w9', 'coi', 'distributor_license', 'dot', 'certification', 'other');
create type public.rfp_status as enum ('draft', 'published', 'closed', 'awarded');
create type public.rfp_response_status as enum ('submitted', 'declined', 'withdrawn');
create type public.email_frequency as enum ('daily', 'weekly', 'never');

-- ---------------------------------------------------------------------------
-- profiles — extends auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'buyer',
  full_name    text,
  company_name text,
  created_at   timestamptz not null default now()
);

-- Helper: resolve the current user's role without tripping RLS recursion.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
-- vendor_applications — filled out BEFORE an account exists. Token-gated.
-- ---------------------------------------------------------------------------
create table public.vendor_applications (
  id                uuid primary key default gen_random_uuid(),
  invitation_token  text not null unique default encode(gen_random_bytes(24), 'hex'),
  status            public.application_status not null default 'pending_review',
  source            public.application_source not null default 'self_applied',
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles (id),

  -- Company Information
  company_name            text not null,
  description             text,
  corporate_address       text,
  state_of_incorporation  text,
  entity_type             text,
  organization_type       text[] not null default '{}',
  special_certification   text,
  nationwide              boolean not null default false,
  us_dot_number           text,
  website_url             text,
  year_founded            integer,
  -- Bucketed range captured by the short "Become a Supplier" interest form
  annual_gallons_range    text,

  -- Sales Rep Contact
  sales_rep_first_name    text,
  sales_rep_last_name     text,
  sales_rep_email         text,
  sales_rep_phone         text,

  -- Dispatch Contact
  dispatch_contact_name   text,
  dispatch_phone          text,
  dispatch_email          text,

  -- Emergency Dispatch Contact
  emergency_dispatch_name   text,
  emergency_dispatch_phone  text,
  emergency_dispatch_email  text,

  -- Billing
  billing_address         text,
  billing_contact_name    text,
  billing_email           text,
  billing_phone           text,
  delivery_contact_info   text,
  billing_system          text,

  -- Operations
  operating_hours             text[] not null default '{}',
  terminals_available         text,
  pricing_basis               text,
  pricing_basis_other         text,
  areas_owned_trucks          text,
  areas_subcontracted         text,
  tankwagons_count            integer,
  transports_count            integer,
  annual_gallons_distributed  bigint,
  standard_order_lead_time    text,

  -- Products & Brands
  products_offered  text[] not null default '{}',
  brands_offered    text,

  -- Emergency Services
  emergency_retainer_willing  text,
  emergency_order_lead_time   text,
  emergency_response_times    text,

  -- Delivery & Additional Capabilities
  delivery_capabilities   text[] not null default '{}',
  additional_services     text[] not null default '{}',
  other_services          text,
  wet_hose_ticket_type    text,
  telematics_system       text,
  dispatch_software       text,

  -- Licensed States
  licensed_states   text[] not null default '{}',

  -- Uploaded document references (Supabase Storage paths), keyed by type:
  -- { "w9Form": {path,name,size}, "certificateOfInsurance": {...}, ... }
  documents         jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vendors — created when an application is approved (denormalized snapshot)
-- ---------------------------------------------------------------------------
create table public.vendors (
  id                        uuid primary key default gen_random_uuid(),
  -- Linked to a profile only AFTER the vendor creates an account post-approval.
  profile_id                uuid references public.profiles (id) on delete set null,
  application_id            uuid references public.vendor_applications (id),
  is_verified               boolean not null default true,
  verified_at               timestamptz default now(),
  verification_expires_at   timestamptz,

  -- Approved company data (denormalized from the application)
  company_name              text not null,
  description               text,
  corporate_address         text,
  state_of_incorporation    text,
  entity_type               text,
  organization_type         text[] not null default '{}',
  special_certification     text,
  nationwide                boolean not null default false,
  us_dot_number             text,
  website_url               text,
  year_founded              integer,

  products_offered          text[] not null default '{}',
  brands_offered            text,
  delivery_capabilities     text[] not null default '{}',
  additional_services       text[] not null default '{}',
  licensed_states           text[] not null default '{}',

  tankwagons_count             integer,
  transports_count             integer,
  annual_gallons_distributed   bigint,
  standard_order_lead_time     text,
  emergency_order_lead_time    text,
  emergency_response_times     text,

  created_at   timestamptz not null default now()
);

-- Resolve the vendor row owned by the current user (linked via profile_id).
create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.vendors where profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- vendor_documents — uploaded files (stored in Supabase Storage)
-- ---------------------------------------------------------------------------
create table public.vendor_documents (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid not null references public.vendors (id) on delete cascade,
  document_type  public.document_type not null,
  file_url       text not null,
  file_name      text not null,
  uploaded_at    timestamptz not null default now(),
  expires_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- vendor_capabilities — flexible many-to-many for searchability
-- ---------------------------------------------------------------------------
create table public.vendor_capabilities (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references public.vendors (id) on delete cascade,
  capability_key    text not null,
  capability_value  jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- buyer_organizations
-- ---------------------------------------------------------------------------
create table public.buyer_organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  industry            text,
  primary_contact_id  uuid references public.profiles (id),
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rfps
-- ---------------------------------------------------------------------------
create table public.rfps (
  id                     uuid primary key default gen_random_uuid(),
  buyer_id               uuid not null references public.profiles (id) on delete cascade,
  title                  text not null,
  description            text,
  fuel_type              text,
  quantity_gallons       bigint,
  delivery_states        text[] not null default '{}',
  delivery_address       text,
  required_capabilities  text[] not null default '{}',
  required_certifications text[] not null default '{}',
  bid_due_date           timestamptz,
  status                 public.rfp_status not null default 'draft',
  awarded_vendor_id      uuid references public.vendors (id),
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rfp_invitations — which vendors are invited to bid
-- ---------------------------------------------------------------------------
create table public.rfp_invitations (
  id            uuid primary key default gen_random_uuid(),
  rfp_id        uuid not null references public.rfps (id) on delete cascade,
  vendor_id     uuid not null references public.vendors (id) on delete cascade,
  invited_at    timestamptz not null default now(),
  viewed_at     timestamptz,
  responded_at  timestamptz,
  unique (rfp_id, vendor_id)
);

-- ---------------------------------------------------------------------------
-- rfp_responses — vendor bids
-- ---------------------------------------------------------------------------
create table public.rfp_responses (
  id                uuid primary key default gen_random_uuid(),
  rfp_id            uuid not null references public.rfps (id) on delete cascade,
  vendor_id         uuid not null references public.vendors (id) on delete cascade,
  price_per_gallon  numeric(10, 4),
  total_price       numeric(14, 2),
  delivery_terms    text,
  validity_days     integer,
  notes             text,
  submitted_at      timestamptz not null default now(),
  status            public.rfp_response_status not null default 'submitted',
  unique (rfp_id, vendor_id)
);

-- ---------------------------------------------------------------------------
-- opportunity_notifications — vendor digest preferences
-- ---------------------------------------------------------------------------
create table public.opportunity_notifications (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        uuid not null references public.vendors (id) on delete cascade,
  fuel_types       text[] not null default '{}',
  states           text[] not null default '{}',
  min_gallons      bigint,
  email_frequency  public.email_frequency not null default 'daily',
  -- Bypass the digest cadence for emergency/rush RFPs that match capabilities.
  emergency_immediate boolean not null default true,
  unique (vendor_id)
);

-- Indexes -------------------------------------------------------------------
create index vendor_applications_status_idx on public.vendor_applications (status);
create index vendors_is_verified_idx        on public.vendors (is_verified);
create index rfps_status_idx                on public.rfps (status);
create index rfps_buyer_id_idx              on public.rfps (buyer_id);
create index rfp_invitations_vendor_idx     on public.rfp_invitations (vendor_id);
create index rfp_responses_rfp_idx          on public.rfp_responses (rfp_id);
create index vendor_documents_vendor_idx    on public.vendor_documents (vendor_id);
create index vendor_capabilities_vendor_idx on public.vendor_capabilities (vendor_id);
create index vendor_capabilities_key_idx    on public.vendor_capabilities (capability_key);

-- Full-text search across vendor company name + description
create index vendors_fts_idx on public.vendors
  using gin (to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(description, '')));

-- Array containment helpers for directory filtering
create index vendors_products_idx     on public.vendors using gin (products_offered);
create index vendors_states_idx       on public.vendors using gin (licensed_states);
create index vendors_capabilities_idx on public.vendors using gin (delivery_capabilities);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles                  enable row level security;
alter table public.vendor_applications        enable row level security;
alter table public.vendors                    enable row level security;
alter table public.vendor_documents           enable row level security;
alter table public.vendor_capabilities        enable row level security;
alter table public.buyer_organizations        enable row level security;
alter table public.rfps                       enable row level security;
alter table public.rfp_invitations            enable row level security;
alter table public.rfp_responses              enable row level security;
alter table public.opportunity_notifications  enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: self read"   on public.profiles for select using (id = auth.uid());
create policy "profiles: self update" on public.profiles for update using (id = auth.uid());
create policy "profiles: self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: admin all"   on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- vendor_applications --------------------------------------------------------
-- Public form submissions and token-based updates run via service role.
-- Authenticated browser access is limited to admins (review queue).
create policy "applications: admin all" on public.vendor_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- vendors --------------------------------------------------------------------
-- Verified vendor profiles are readable by any authenticated user (directory).
create policy "vendors: verified readable" on public.vendors
  for select using (is_verified = true or profile_id = auth.uid() or public.is_admin());
create policy "vendors: self update" on public.vendors
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "vendors: admin all" on public.vendors
  for all using (public.is_admin()) with check (public.is_admin());

-- vendor_documents -----------------------------------------------------------
create policy "documents: owner read" on public.vendor_documents
  for select using (vendor_id = public.current_vendor_id() or public.is_admin());
create policy "documents: owner write" on public.vendor_documents
  for all using (vendor_id = public.current_vendor_id() or public.is_admin())
  with check (vendor_id = public.current_vendor_id() or public.is_admin());

-- vendor_capabilities --------------------------------------------------------
create policy "capabilities: verified readable" on public.vendor_capabilities
  for select using (
    public.is_admin()
    or vendor_id = public.current_vendor_id()
    or exists (select 1 from public.vendors v where v.id = vendor_capabilities.vendor_id and v.is_verified)
  );
create policy "capabilities: owner write" on public.vendor_capabilities
  for all using (vendor_id = public.current_vendor_id() or public.is_admin())
  with check (vendor_id = public.current_vendor_id() or public.is_admin());

-- buyer_organizations --------------------------------------------------------
create policy "buyer orgs: member read" on public.buyer_organizations
  for select using (primary_contact_id = auth.uid() or public.is_admin());
create policy "buyer orgs: member write" on public.buyer_organizations
  for all using (primary_contact_id = auth.uid() or public.is_admin())
  with check (primary_contact_id = auth.uid() or public.is_admin());

-- rfps -----------------------------------------------------------------------
-- Buyers manage their own RFPs; invited vendors can read; admins see all.
create policy "rfps: buyer manage" on public.rfps
  for all using (buyer_id = auth.uid() or public.is_admin())
  with check (buyer_id = auth.uid() or public.is_admin());
create policy "rfps: invited vendor read" on public.rfps
  for select using (
    public.is_admin()
    or buyer_id = auth.uid()
    or exists (
      select 1 from public.rfp_invitations i
      where i.rfp_id = rfps.id and i.vendor_id = public.current_vendor_id()
    )
  );

-- rfp_invitations ------------------------------------------------------------
create policy "invitations: visibility" on public.rfp_invitations
  for select using (
    public.is_admin()
    or vendor_id = public.current_vendor_id()
    or exists (select 1 from public.rfps r where r.id = rfp_invitations.rfp_id and r.buyer_id = auth.uid())
  );
create policy "invitations: buyer write" on public.rfp_invitations
  for all using (
    public.is_admin()
    or exists (select 1 from public.rfps r where r.id = rfp_invitations.rfp_id and r.buyer_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.rfps r where r.id = rfp_invitations.rfp_id and r.buyer_id = auth.uid())
  );
create policy "invitations: vendor mark viewed" on public.rfp_invitations
  for update using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

-- rfp_responses --------------------------------------------------------------
-- Vendors manage their own bids; the owning buyer can read responses; admins all.
create policy "responses: vendor manage" on public.rfp_responses
  for all using (vendor_id = public.current_vendor_id() or public.is_admin())
  with check (vendor_id = public.current_vendor_id() or public.is_admin());
create policy "responses: buyer read" on public.rfp_responses
  for select using (
    public.is_admin()
    or vendor_id = public.current_vendor_id()
    or exists (select 1 from public.rfps r where r.id = rfp_responses.rfp_id and r.buyer_id = auth.uid())
  );

-- opportunity_notifications --------------------------------------------------
create policy "notifications: owner manage" on public.opportunity_notifications
  for all using (vendor_id = public.current_vendor_id() or public.is_admin())
  with check (vendor_id = public.current_vendor_id() or public.is_admin());
