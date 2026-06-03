-- Fix: "infinite recursion detected in policy for relation rfps" (42P17)
--
-- The rfps SELECT policy referenced rfp_invitations, and the rfp_invitations
-- policies referenced rfps — a mutual loop that Postgres rejects. We move the
-- cross-table existence checks into SECURITY DEFINER functions, which run with
-- the function owner's rights and therefore bypass RLS (no re-entry into the
-- referenced table's policies), breaking the recursion.

create or replace function public.vendor_is_invited(p_rfp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rfp_invitations i
    where i.rfp_id = p_rfp_id
      and i.vendor_id = public.current_vendor_id()
  );
$$;

create or replace function public.is_rfp_owner(p_rfp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rfps r
    where r.id = p_rfp_id
      and r.buyer_id = auth.uid()
  );
$$;

-- rfps: invited vendors can read (now via the helper, no direct table ref) ----
drop policy if exists "rfps: invited vendor read" on public.rfps;
create policy "rfps: invited vendor read" on public.rfps
  for select using (
    public.is_admin()
    or buyer_id = auth.uid()
    or public.vendor_is_invited(id)
  );

-- rfp_invitations: visibility + buyer write (now via the helper) --------------
drop policy if exists "invitations: visibility" on public.rfp_invitations;
create policy "invitations: visibility" on public.rfp_invitations
  for select using (
    public.is_admin()
    or vendor_id = public.current_vendor_id()
    or public.is_rfp_owner(rfp_id)
  );

drop policy if exists "invitations: buyer write" on public.rfp_invitations;
create policy "invitations: buyer write" on public.rfp_invitations
  for all using (
    public.is_admin()
    or public.is_rfp_owner(rfp_id)
  )
  with check (
    public.is_admin()
    or public.is_rfp_owner(rfp_id)
  );

-- rfp_responses: buyer read (use the helper for consistency / safety) ---------
drop policy if exists "responses: buyer read" on public.rfp_responses;
create policy "responses: buyer read" on public.rfp_responses
  for select using (
    public.is_admin()
    or vendor_id = public.current_vendor_id()
    or public.is_rfp_owner(rfp_id)
  );
