-- P3.01 — Close CRM sync.
--
-- Two related concerns in one migration:
--
-- 1. Track Close CRM sync lifecycle on the `leads` row (additive only).
--    `close_crm_id` already exists from
--    20260409000000_core_domain_tables.sql:113 — this migration adds the
--    surrounding lifecycle metadata.
--
-- 2. Create `ins_feature_flags` if it does not already exist. P2.02 also
--    creates this table; both migrations use `create table if not exists` so
--    whichever lands first wins and the second is a no-op. The shape is
--    identical across both specs (see plans/dm-setter-roadmap/p3-close-handoff/01-push-emails-close.md).
--
-- The `close_sync.enabled` row is seeded as `enabled = false` so this
-- migration ships with zero behavioural change to live traffic. Cutover for
-- a brand is a single SQL UPDATE — no redeploy required.

-- ============================================================
-- ins_feature_flags (created here OR by P2.02, whichever lands first)
-- ============================================================
create table if not exists public.ins_feature_flags (
  key         text not null,
  scope       text not null check (scope in ('global', 'brand')),
  scope_id    text not null default '*',
  enabled     boolean not null default false,
  updated_by  text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),

  constraint ins_feature_flags_pkey primary key (key, scope, scope_id)
);

create index if not exists idx_ins_feature_flags_key
  on public.ins_feature_flags (key);

alter table public.ins_feature_flags enable row level security;

-- Service role bypass — feature flags are read by server code only.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'ins_feature_flags'
       and policyname = 'Service role bypass on ins_feature_flags'
  ) then
    create policy "Service role bypass on ins_feature_flags"
      on public.ins_feature_flags
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- ============================================================
-- leads.close_sync_* columns (additive, defaulted)
-- ============================================================
alter table public.leads
  add column if not exists close_sync_status text not null default 'pending'
    check (close_sync_status in ('pending', 'sent', 'failed', 'skipped', 'failed_permanent')),
  add column if not exists close_sync_attempted_at timestamptz,
  add column if not exists close_sync_error_message text,
  add column if not exists close_sync_attempts integer not null default 0;

-- Partial index supports the cron's "failed-and-retryable" scan without
-- touching every successful row.
create index if not exists idx_leads_close_sync_status_attempts
  on public.leads (close_sync_status, close_sync_attempts)
  where close_sync_status in ('failed', 'pending');

-- ============================================================
-- Seed the per-brand feature flag in the OFF state.
-- Cutover for VendingPreneurs is a single SQL UPDATE in production.
-- ============================================================
insert into public.ins_feature_flags (key, scope, scope_id, enabled, updated_by)
values ('close_sync.enabled', 'brand', 'VendingPreneurs', false, 'p3-01-migration')
on conflict (key, scope, scope_id) do nothing;
