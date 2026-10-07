-- GridLink — security hardening.
--
-- Closes holes left by the MVP policies: world-readable document storage,
-- self-service role escalation, vendors writing their own verification and
-- bid/invoice rows directly, and AI bid briefs readable by competing vendors.
--
-- After this migration the browser (anon / authenticated keys) can only READ
-- what the row policies allow, plus the few writes listed at the bottom.
-- Every other write goes through server actions that check ownership and then
-- use the service role, which bypasses RLS. Safe to run more than once.

-- ===========================================================================
-- 1. Storage: no client access to any bucket
-- ===========================================================================
-- Uploads use server-issued signed upload URLs and downloads use server-issued
-- signed URLs (both minted with the service role after an ownership check), so
-- storage.objects needs no anon/authenticated policy at all.
drop policy if exists "vendor-documents: anon upload"          on storage.objects;
drop policy if exists "vendor-documents: anon update"          on storage.objects;
drop policy if exists "vendor-documents: read"                 on storage.objects;
drop policy if exists "vendor-documents: delete"               on storage.objects;
drop policy if exists "rfp-attachments: authenticated upload"  on storage.objects;
drop policy if exists "rfp-attachments: authenticated read"    on storage.objects;
drop policy if exists "delivery-docs: authenticated upload"    on storage.objects;
drop policy if exists "delivery-docs: authenticated read"      on storage.objects;

-- Private, with size and type limits enforced by the storage server itself
-- (these apply to signed-URL uploads too). Keep in step with
-- src/lib/storage/paths.ts. Existing objects are unaffected.
update storage.buckets
   set public = false,
       file_size_limit = 10485760,   -- 10 MB
       allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
 where id = 'vendor-documents';

update storage.buckets
   set public = false,
       file_size_limit = 15728640,   -- 15 MB
       allowed_mime_types = array[
         'application/pdf', 'image/png', 'image/jpeg', 'text/csv',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'rfp-attachments';

update storage.buckets
   set public = false,
       file_size_limit = 15728640,   -- 15 MB
       allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
 where id = 'delivery-docs';

update storage.buckets set public = false where id = 'invoices';

-- ===========================================================================
-- 2. AI bid briefs: off the rfps row, into a service-role-only table
-- ===========================================================================
-- A brief names every bidder and their price. On rfps it was readable by every
-- invited vendor through "rfps: invited vendor read". RLS on + no policies =
-- nobody but the service role; src/lib/data/ai-briefs.ts checks RFP ownership.
create table if not exists public.rfp_ai_briefs (
  rfp_id        uuid primary key references public.rfps (id) on delete cascade,
  brief         jsonb not null,
  input_hash    text,
  generated_at  timestamptz not null default now()
);
alter table public.rfp_ai_briefs enable row level security;
revoke all on public.rfp_ai_briefs from anon, authenticated;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rfps' and column_name = 'ai_brief'
  ) then
    execute $copy$
      insert into public.rfp_ai_briefs (rfp_id, brief, input_hash, generated_at)
      select id, ai_brief, ai_brief_hash, coalesce(ai_brief_at, now())
      from public.rfps
      where ai_brief is not null
      on conflict (rfp_id) do nothing
    $copy$;
  end if;
end
$$;

alter table public.rfps
  drop column if exists ai_brief,
  drop column if exists ai_brief_at,
  drop column if exists ai_brief_hash;

-- ===========================================================================
-- 3. profiles: no self-service role changes
-- ===========================================================================
-- "self update" had no WITH CHECK and no column limit, so any user could set
-- role = 'admin' on their own row; "self insert" let a fresh auth user create
-- a profile with any role. Profiles are created by the create-account server
-- actions with the service role, so clients never need to insert.
drop policy if exists "profiles: self insert" on public.profiles;
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  -- current_user_role() reads the stored row, so this pins role to its old value.
  with check (id = auth.uid() and role = public.current_user_role());

-- Column privileges on top of the policy: even the admin policy can't be used
-- from a browser session to touch role / is_demo.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, company_name) on public.profiles to authenticated;

-- ===========================================================================
-- 4. vendors: no self-update
-- ===========================================================================
-- The self-update policy covered every column, including is_verified,
-- verified_at, verification_expires_at and the locked legal fields.
-- updateVendorProfile now writes its fixed column list with the service role
-- after resolving the caller's own vendor, so the policy isn't needed.
drop policy if exists "vendors: self update" on public.vendors;
revoke insert, update, delete on public.vendors from anon, authenticated;

-- The directory is for signed-in users; anon had it through the default role.
drop policy if exists "vendors: verified readable" on public.vendors;
create policy "vendors: verified readable" on public.vendors
  for select to authenticated
  using (is_verified = true or profile_id = auth.uid() or public.is_admin());

-- Document rows carry the storage path and the expiry date compliance relies
-- on; uploads are recorded server-side after validation. Vendors keep read.
drop policy if exists "documents: owner write" on public.vendor_documents;
revoke insert, update, delete on public.vendor_documents from anon, authenticated;

-- ===========================================================================
-- 5. Invoices: read-only from the browser
-- ===========================================================================
-- The FOR ALL vendor policies let a vendor rewrite a sent invoice's totals,
-- status or amount_paid directly. All invoice writes already go through
-- src/lib/data/invoices.ts with the service role.
drop policy if exists "invoices: vendor write"   on public.invoices;
drop policy if exists "line items: vendor write" on public.invoice_line_items;
revoke insert, update, delete on public.invoices           from anon, authenticated;
revoke insert, update, delete on public.invoice_line_items from anon, authenticated;

-- Hands out invoice numbers and is SECURITY DEFINER: anyone could burn through
-- any vendor's sequence. Only invoices.ts calls it, with the service role.
revoke execute on function public.next_invoice_seq(uuid) from public, anon, authenticated;
grant  execute on function public.next_invoice_seq(uuid) to service_role;

-- ===========================================================================
-- 6. Bids and invitations: vendors read, the server writes
-- ===========================================================================
-- "responses: vendor manage" let a vendor insert a bid for an RFP it was never
-- invited to, or edit a bid after the deadline. Submit / withdraw now run
-- server-side (invitation, deadline and status checks) with the service role.
-- Vendors still read their own bids through "responses: buyer read".
drop policy if exists "responses: vendor manage" on public.rfp_responses;
revoke insert, update, delete on public.rfp_responses from anon, authenticated;

-- "vendor mark viewed" had no column limit: a vendor could re-point its
-- invitation at any rfp_id (and so read that RFP), or clear declined_at.
-- Mark-viewed and decline now run server-side. Vendors still read their own
-- invitations through "invitations: visibility"; buyers keep "buyer write".
drop policy if exists "invitations: vendor mark viewed" on public.rfp_invitations;

-- ===========================================================================
-- 7. rfps: only buyers create them
-- ===========================================================================
-- Without the role check any signed-in vendor could insert an RFP with
-- buyer_id = itself and become an "RFP owner" for the invitation policies.
drop policy if exists "rfps: buyer manage" on public.rfps;
create policy "rfps: buyer manage" on public.rfps
  for all
  using (buyer_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (buyer_id = auth.uid() and public.current_user_role() = 'buyer')
  );

-- ===========================================================================
-- 8. Ratings: the two parties and admins only
-- ===========================================================================
-- "using (true)" exposed every buyer's ratings and free-text comments (and so
-- who buys from whom) to anyone, signed in or not. The app shows aggregates
-- through the service role, so the browser only needs a party's own rows.
drop policy if exists "ratings: read" on public.supplier_ratings;
create policy "ratings: read" on public.supplier_ratings
  for select to authenticated
  using (buyer_id = auth.uid() or vendor_id = public.current_vendor_id() or public.is_admin());

-- What the browser session can still write after this migration:
--   rfps                       buyer's own rows            (saveRfpFromWizard)
--   rfp_invitations            owner of the RFP            (policy kept; app uses service role)
--   opportunity_notifications  vendor's own row            (notification settings)
--   buyer_organizations, buyer_sites, emissions_targets, vendor_capabilities
--                              owner's own rows            (policies unchanged)
--   profiles                   own full_name, company_name

notify pgrst, 'reload schema';
