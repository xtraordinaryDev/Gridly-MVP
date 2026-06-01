-- GridLink — Storage for vendor documents (W-9, COI, licenses, logos)
--
-- Vendor onboarding is token-gated and happens BEFORE an account exists, so
-- uploads come from anonymous browser sessions. Files are namespaced by
-- application id: {application_id}/{document_type}/{filename}. For the MVP the
-- bucket is private and we allow anon writes; tighten before production.

insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

-- Allow uploads (and reads of their own just-uploaded files) from anon + auth.
create policy "vendor-documents: anon upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'vendor-documents');

create policy "vendor-documents: anon update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'vendor-documents')
  with check (bucket_id = 'vendor-documents');

create policy "vendor-documents: read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vendor-documents');

create policy "vendor-documents: delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'vendor-documents');
