-- Durable storage rows for operator-uploaded email attachments.
--
-- Files live in the private Supabase Storage bucket `email-assets` at:
--   {brand}/{flow_id}/{asset_id}/{file_name}
--
-- Bucket creation + storage.objects RLS policies are MANUAL — see
-- supabase/migrations/_manual/20260502_email_assets_bucket.sql for the
-- SQL the user runs once via the Supabase SQL editor (the `storage`
-- schema is owned by the storage extension and some tooling refuses to
-- mutate it from a regular migration).
--
-- The `ins_email_assets` rows are pure provenance: they tell us what
-- got uploaded, when, by whom, and let us archive without losing the
-- audit trail. Signed URLs are generated at send time (P2.04) — never
-- cached cross-request.

create table public.ins_email_assets (
  id            uuid primary key default gen_random_uuid(),
  brand         text not null,
  flow_id       text not null,
  block_id      text not null default 'email',
  file_name     text not null,
  content_type  text not null,
  size_bytes    integer not null
                check (size_bytes > 0 and size_bytes <= 20971520), -- 20 MB
  storage_path  text not null,
  checksum      text not null,           -- sha-256 hex of file contents
  description   text,
  created_by    text,
  created_at    timestamptz not null default now(),
  archived_at   timestamptz,

  constraint ins_email_assets_storage_path_unique unique (storage_path),
  constraint ins_email_assets_filename_chk check (
    file_name ~ '^[A-Za-z0-9._-]+$' and char_length(file_name) <= 200
  ),
  constraint ins_email_assets_ct_chk check (
    content_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'application/zip'
    )
  )
);

create index idx_ins_email_assets_brand_flow_active
  on public.ins_email_assets (brand, flow_id)
  where archived_at is null;

create index idx_ins_email_assets_brand_flow_all
  on public.ins_email_assets (brand, flow_id);

alter table public.ins_email_assets enable row level security;

create policy "Service role bypass on ins_email_assets"
  on public.ins_email_assets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- DOWN
-- drop policy if exists "Service role bypass on ins_email_assets" on public.ins_email_assets;
-- drop index if exists public.idx_ins_email_assets_brand_flow_active;
-- drop index if exists public.idx_ins_email_assets_brand_flow_all;
-- drop table if exists public.ins_email_assets;
