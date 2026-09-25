-- GridLink — AI-generated bid comparison briefs cached on the RFP
alter table public.rfps
  add column if not exists ai_brief jsonb,
  add column if not exists ai_brief_at timestamptz,
  add column if not exists ai_brief_hash text;
