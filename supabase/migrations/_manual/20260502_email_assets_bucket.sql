-- ====================================================================
-- MANUAL ONE-TIME SETUP — RUN VIA SUPABASE SQL EDITOR
-- ====================================================================
--
-- This file is NOT auto-applied by `supabase db push`. The Supabase
-- storage extension owns the `storage` schema and the `auth` role-based
-- policies; CLI migrations against `storage.*` are inconsistent across
-- tooling versions. Run this once per environment (dev, preview, prod)
-- via the SQL editor at:
--   https://supabase.com/dashboard/project/<project-id>/sql
--
-- Idempotent — safe to re-run.

-- 1. Create the private `email-assets` bucket with allowed MIME types
--    and a 20 MB per-file ceiling.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-assets',
  'email-assets',
  false,
  20971520,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/zip'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/zip'
  ];

-- 2. Restrict reads/writes to the service-role client. No anon access.
--    All public-facing reads happen via short-lived signed URLs that
--    `email-assets.ts` generates at send time.
drop policy if exists "Service role manage email-assets bucket" on storage.objects;

create policy "Service role manage email-assets bucket"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'email-assets')
  with check (bucket_id = 'email-assets');
