-- GridLink — optional group label on update contacts (e.g. "gener8tor"), for
-- filtering the list and picking recipients by group.
alter table public.update_contacts add column if not exists group_name text;
create index if not exists update_contacts_group_idx on public.update_contacts (group_name);
