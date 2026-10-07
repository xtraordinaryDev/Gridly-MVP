-- GridLink — remember a draft RFP's supplier selection so reopening the draft
-- doesn't silently reset it to auto-invite.
alter table public.rfps
  add column if not exists supplier_invite_mode text not null default 'auto'
    check (supplier_invite_mode in ('auto', 'manual')),
  add column if not exists selected_vendor_ids uuid[] not null default '{}';
