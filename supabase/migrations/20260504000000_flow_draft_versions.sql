-- Flow Builder draft version history + audit log.
--
-- Adds two tables for P4.04 (warnings + version history with rollback):
--   - ins_flow_draft_versions: per-(brand, flow_id) snapshots of the draft
--     state. Each row is one persisted version (autosave-confirm, manual
--     save, or restore-pre snapshot).
--   - ins_flow_draft_audit:    append-only log of every save / restore /
--     discard event. Source of truth for the operator-visible Versions tab.
--
-- Both tables are additive (`if not exists`) and live alongside the existing
-- `ins_flow_drafts` table without changing it. Service-role-only RLS.

create table if not exists public.ins_flow_draft_versions (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  flow_id         text not null,
  version_number  integer not null,
  schema_version  integer not null default 4,
  state           jsonb not null,
  reason          text,
  created_by      text,
  created_at      timestamptz not null default now(),

  constraint ins_flow_draft_versions_unique
    unique (brand, flow_id, version_number),
  constraint ins_flow_draft_versions_state_object
    check (jsonb_typeof(state) = 'object'),
  constraint ins_flow_draft_versions_reason_length
    check (reason is null or char_length(reason) <= 240)
);

create index if not exists idx_ins_flow_draft_versions_brand_flow
  on public.ins_flow_draft_versions (brand, flow_id, version_number desc);

alter table public.ins_flow_draft_versions enable row level security;

drop policy if exists "Service role bypass on ins_flow_draft_versions"
  on public.ins_flow_draft_versions;

create policy "Service role bypass on ins_flow_draft_versions"
  on public.ins_flow_draft_versions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.ins_flow_draft_audit (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  flow_id             text not null,
  version_number      integer,
  action              text not null check (action in (
    'autosave',
    'manual_save',
    'restore',
    'discard_modal',
    'restore_pre_snapshot'
  )),
  reason              text,
  changed_field_ids   text[] not null default '{}',
  actor_email         text,
  created_at          timestamptz not null default now(),

  constraint ins_flow_draft_audit_reason_length
    check (reason is null or char_length(reason) <= 240)
);

create index if not exists idx_ins_flow_draft_audit_brand_flow_time
  on public.ins_flow_draft_audit (brand, flow_id, created_at desc);

alter table public.ins_flow_draft_audit enable row level security;

drop policy if exists "Service role bypass on ins_flow_draft_audit"
  on public.ins_flow_draft_audit;

create policy "Service role bypass on ins_flow_draft_audit"
  on public.ins_flow_draft_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- DOWN
-- drop policy if exists "Service role bypass on ins_flow_draft_audit" on public.ins_flow_draft_audit;
-- drop table if exists public.ins_flow_draft_audit;
-- drop policy if exists "Service role bypass on ins_flow_draft_versions" on public.ins_flow_draft_versions;
-- drop table if exists public.ins_flow_draft_versions;
