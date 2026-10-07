-- GridLink — guards for the admin review flows.
--
-- 1. One vendor per application. Approving the same application twice (two
--    tabs) used to insert two vendors; the app now makes the status transition
--    conditional, and this index is the backstop.
-- 2. buyer_applications.review_notes — the admin's approve/reject note, which
--    was previously discarded.

-- De-duplicate before the unique index can be built. For each application keep
-- the vendor that has a login (profile_id), else the oldest; ties break on id.
-- Everything that references vendors.id is first repointed at the keeper so
-- nothing is lost to ON DELETE CASCADE (and rfps.awarded_vendor_id, which has
-- no cascade, doesn't block the delete).
do $$
declare
  dup record;
  ref record;
begin
  create temporary table _vendor_dedupe on commit drop as
  select id as duplicate_id, keeper_id
  from (
    select
      id,
      first_value(id) over (
        partition by application_id
        order by (profile_id is not null) desc, created_at asc, id asc
      ) as keeper_id
    from public.vendors
    where application_id is not null
  ) ranked
  where id <> keeper_id;

  for dup in select duplicate_id, keeper_id from _vendor_dedupe loop
    -- Every single-column foreign key onto vendors(id), whatever tables exist by now.
    for ref in
      select c.conrelid::regclass as tbl, a.attname as col
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f'
        and c.confrelid = 'public.vendors'::regclass
        and array_length(c.conkey, 1) = 1
    loop
      begin
        execute format('update %s set %I = $1 where %I = $2', ref.tbl, ref.col, ref.col)
          using dup.keeper_id, dup.duplicate_id;
      exception when unique_violation then
        -- The keeper already has the equivalent row (e.g. the same RFP
        -- invitation); the duplicate's copy goes with the delete below.
        null;
      end;
    end loop;

    delete from public.vendors where id = dup.duplicate_id;
  end loop;
end $$;

create unique index if not exists vendors_application_id_key
  on public.vendors (application_id)
  where application_id is not null;

alter table public.buyer_applications
  add column if not exists review_notes text;
