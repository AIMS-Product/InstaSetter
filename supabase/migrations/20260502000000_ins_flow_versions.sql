-- Versioned, rollback-capable snapshots of operator-published Flow Builder
-- config. Adds five tables and one helper function:
--   * ins_flow_versions      — append-only snapshots of compiled prompt config
--   * ins_flow_channels      — active version pointer per (brand, flow, channel)
--   * ins_flow_publish_log   — audit log of publish + rollback actions
--   * ins_feature_flags      — per-key/scope/scope_id feature flag rows
--   * ins_feature_flags_audit — append-only audit for every flag flip
--
-- All tables use `if not exists` so a parallel migration in P3 (which extends
-- ins_feature_flags) does not fight this one. RLS is enabled with a service-
-- role bypass policy matching the pattern in 20260422083000_ins_flow_drafts.

create table if not exists public.ins_flow_versions (
  id                uuid primary key default gen_random_uuid(),
  brand             text not null,
  flow_id           text not null,
  version_number    integer not null,
  state             jsonb not null,
  compiled          jsonb not null,
  checksum          text not null,
  source            text not null default 'editor',
  note              text,
  published_by      text,
  published_at      timestamptz not null default now(),

  constraint ins_flow_versions_brand_flow_version_unique
    unique (brand, flow_id, version_number),
  constraint ins_flow_versions_source_chk
    check (source in ('code','editor','rollback')),
  constraint ins_flow_versions_state_object_chk
    check (jsonb_typeof(state) = 'object'),
  constraint ins_flow_versions_compiled_object_chk
    check (jsonb_typeof(compiled) = 'object')
);

create index if not exists idx_ins_flow_versions_brand_flow
  on public.ins_flow_versions (brand, flow_id, version_number desc);

alter table public.ins_flow_versions enable row level security;

drop policy if exists "Service role bypass on ins_flow_versions"
  on public.ins_flow_versions;

create policy "Service role bypass on ins_flow_versions"
  on public.ins_flow_versions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


create table if not exists public.ins_flow_channels (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  flow_id             text not null,
  channel             text not null default 'ig_organic_dm',
  active_version_id   uuid references public.ins_flow_versions (id) on delete restrict,
  updated_by          text,
  updated_at          timestamptz not null default now(),

  constraint ins_flow_channels_brand_flow_channel_unique
    unique (brand, flow_id, channel)
);

create index if not exists idx_ins_flow_channels_brand_flow_channel
  on public.ins_flow_channels (brand, flow_id, channel);

alter table public.ins_flow_channels enable row level security;

drop policy if exists "Service role bypass on ins_flow_channels"
  on public.ins_flow_channels;

create policy "Service role bypass on ins_flow_channels"
  on public.ins_flow_channels
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


create table if not exists public.ins_flow_publish_log (
  id                uuid primary key default gen_random_uuid(),
  brand             text not null,
  flow_id           text not null,
  version_id        uuid not null references public.ins_flow_versions (id) on delete restrict,
  action            text not null check (action in ('publish','rollback')),
  actor             text,
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ins_flow_publish_log_brand_flow
  on public.ins_flow_publish_log (brand, flow_id, created_at desc);

alter table public.ins_flow_publish_log enable row level security;

drop policy if exists "Service role bypass on ins_flow_publish_log"
  on public.ins_flow_publish_log;

create policy "Service role bypass on ins_flow_publish_log"
  on public.ins_flow_publish_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


create table if not exists public.ins_feature_flags (
  id          uuid primary key default gen_random_uuid(),
  key         text not null,
  scope       text not null check (scope in ('global','brand')),
  scope_id    text,
  enabled     boolean not null default false,
  updated_by  text,
  updated_at  timestamptz not null default now(),

  constraint ins_feature_flags_scope_check check (
    (scope = 'global' and scope_id is null) or
    (scope = 'brand' and scope_id is not null)
  )
);

-- Unique index for global flags (key must be unique where scope='global')
create unique index if not exists idx_ins_feature_flags_global_unique
  on public.ins_feature_flags (key)
  where scope = 'global' and scope_id is null;

-- Unique index for brand-scoped flags (key + scope_id must be unique where scope='brand')
create unique index if not exists idx_ins_feature_flags_brand_unique
  on public.ins_feature_flags (key, scope_id)
  where scope = 'brand';

-- General query index for lookups
create index if not exists idx_ins_feature_flags_key_scope
  on public.ins_feature_flags (key, scope, scope_id);

alter table public.ins_feature_flags enable row level security;

drop policy if exists "Service role bypass on ins_feature_flags"
  on public.ins_feature_flags;

create policy "Service role bypass on ins_feature_flags"
  on public.ins_feature_flags
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- Append-only audit log for every flag flip (manual or automatic).
-- Pairs with ins_feature_flags the same way ins_flow_publish_log pairs with
-- ins_flow_versions. ON DELETE RESTRICT on the FK because the audit row
-- must outlive its target flag (you cannot retroactively erase that an
-- auto-pause happened — see ROLLOUT.md safety invariant #8).
create table if not exists public.ins_feature_flags_audit (
  id          uuid primary key default gen_random_uuid(),
  flag_id     uuid not null references public.ins_feature_flags(id) on delete restrict,
  brand       text not null,
  action      text not null check (action in ('enabled','disabled','paused-auto','paused-manual','resumed')),
  actor       text,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ins_feature_flags_audit_flag_brand
  on public.ins_feature_flags_audit (flag_id, brand, created_at desc);

alter table public.ins_feature_flags_audit enable row level security;

drop policy if exists "Service role bypass on ins_feature_flags_audit"
  on public.ins_feature_flags_audit;

create policy "Service role bypass on ins_feature_flags_audit"
  on public.ins_feature_flags_audit
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- Atomic publish helper. Inserts a new ins_flow_versions row, updates the
-- channel pointer and writes a ins_flow_publish_log entry in one transaction.
-- Returns the new row's id. The function is `security definer` and granted
-- only to service_role so it cannot be invoked by anon/authenticated clients.
create or replace function public.ins_publish_flow(
  p_brand text,
  p_flow_id text,
  p_channel text,
  p_state jsonb,
  p_compiled jsonb,
  p_checksum text,
  p_source text,
  p_note text,
  p_published_by text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_next int;
  v_version_id uuid;
  v_log_action text;
begin
  select coalesce(max(version_number), 0) + 1
    into v_next
    from public.ins_flow_versions
    where brand = p_brand and flow_id = p_flow_id;

  insert into public.ins_flow_versions
    (brand, flow_id, version_number, state, compiled, checksum, source, note, published_by)
  values
    (p_brand, p_flow_id, v_next, p_state, p_compiled, p_checksum, p_source, p_note, p_published_by)
  returning id into v_version_id;

  insert into public.ins_flow_channels (brand, flow_id, channel, active_version_id, updated_by)
  values (p_brand, p_flow_id, p_channel, v_version_id, p_published_by)
  on conflict (brand, flow_id, channel)
  do update set active_version_id = v_version_id, updated_by = p_published_by, updated_at = now();

  -- Source 'rollback' rows still record the action as 'rollback' in the log.
  -- All other sources (editor / code) are recorded as 'publish'.
  if p_source = 'rollback' then
    v_log_action := 'rollback';
  else
    v_log_action := 'publish';
  end if;

  insert into public.ins_flow_publish_log (brand, flow_id, version_id, action, actor, note)
  values (p_brand, p_flow_id, v_version_id, v_log_action, p_published_by, p_note);

  return v_version_id;
end;
$$;

revoke all on function public.ins_publish_flow(text, text, text, jsonb, jsonb, text, text, text, text) from public;
grant execute on function public.ins_publish_flow(text, text, text, jsonb, jsonb, text, text, text, text) to service_role;


-- Atomic flag upsert + audit. Performs the flag upsert (ins_feature_flags) and
-- the audit insert (ins_feature_flags_audit) atomically in a single transaction.
-- Returns the flag_id. The function is `security definer` and granted only to
-- service_role so it cannot be invoked by anon/authenticated clients.
create or replace function public.ins_set_feature_flag(
  p_key text,
  p_scope text,
  p_scope_id text,
  p_enabled boolean,
  p_actor text,
  p_reason text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_flag_id uuid;
  v_previously_enabled boolean;
  v_action text;
  v_brand text;
begin
  -- Fetch existing flag (if any)
  select id, enabled
    into v_flag_id, v_previously_enabled
    from public.ins_feature_flags
    where key = p_key
      and scope = p_scope
      and (
        (p_scope_id is null and scope_id is null) or
        (scope_id = p_scope_id)
      );

  -- Upsert the flag row
  if v_flag_id is not null then
    update public.ins_feature_flags
      set enabled = p_enabled,
          updated_at = now(),
          updated_by = p_actor
      where id = v_flag_id;
  else
    insert into public.ins_feature_flags (key, scope, scope_id, enabled, updated_by, updated_at)
      values (p_key, p_scope, p_scope_id, p_enabled, p_actor, now())
      returning id into v_flag_id;
    v_previously_enabled := false;
  end if;

  -- Derive audit action
  if p_enabled then
    if v_previously_enabled = false and p_actor like 'system:%' then
      v_action := 'enabled';
    elsif v_previously_enabled = false then
      v_action := 'enabled';
    else
      v_action := 'resumed';
    end if;
  else
    if p_actor like 'system:auto-pause%' then
      v_action := 'paused-auto';
    elsif p_actor like 'system:%' then
      v_action := 'paused-auto';
    elsif v_previously_enabled then
      v_action := 'paused-manual';
    else
      v_action := 'disabled';
    end if;
  end if;

  -- Determine brand for audit
  if p_scope = 'brand' then
    v_brand := coalesce(p_scope_id, '');
  else
    v_brand := 'global';
  end if;

  -- Insert audit row
  insert into public.ins_feature_flags_audit (flag_id, brand, action, actor, reason)
    values (v_flag_id, v_brand, v_action, p_actor, p_reason);

  return v_flag_id;
end;
$$;

revoke all on function public.ins_set_feature_flag(text, text, text, boolean, text, text) from public;
grant execute on function public.ins_set_feature_flag(text, text, text, boolean, text, text) to service_role;


-- Pin conversations to the published flow version that was active at creation.
-- Nullable so existing rows (and pre-cutover conversations) stay safe; the
-- engine's `flow_version_id IS NULL` carve-out preserves byte-identical
-- pre-cutover behaviour for in-flight rows.
alter table public.conversations
  add column if not exists flow_version_id uuid;

create index if not exists conversations_flow_version_id_idx
  on public.conversations (flow_version_id);

-- DOWN
-- alter table public.conversations drop column if exists flow_version_id;
-- drop function if exists public.ins_publish_flow(text, text, text, jsonb, jsonb, text, text, text, text);
-- drop policy if exists "Service role bypass on ins_feature_flags_audit" on public.ins_feature_flags_audit;
-- drop table if exists public.ins_feature_flags_audit;
-- drop policy if exists "Service role bypass on ins_feature_flags" on public.ins_feature_flags;
-- drop table if exists public.ins_feature_flags;
-- drop policy if exists "Service role bypass on ins_flow_publish_log" on public.ins_flow_publish_log;
-- drop table if exists public.ins_flow_publish_log;
-- drop policy if exists "Service role bypass on ins_flow_channels" on public.ins_flow_channels;
-- drop table if exists public.ins_flow_channels;
-- drop policy if exists "Service role bypass on ins_flow_versions" on public.ins_flow_versions;
-- drop table if exists public.ins_flow_versions;
