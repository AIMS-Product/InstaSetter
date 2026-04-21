-- Shared draft storage for Flow Builder edits before publish/version tables land.

create table public.ins_flow_drafts (
  id                uuid primary key default gen_random_uuid(),
  brand             text not null,
  flow_id           text not null,
  booking_url       text,
  schema_version    integer not null default 4,
  state             jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint ins_flow_drafts_brand_flow_unique unique (brand, flow_id),
  constraint ins_flow_drafts_state_object check (jsonb_typeof(state) = 'object')
);

create index idx_ins_flow_drafts_brand on public.ins_flow_drafts (brand);
create index idx_ins_flow_drafts_flow_id on public.ins_flow_drafts (flow_id);

alter table public.ins_flow_drafts enable row level security;

create policy "Service role bypass on ins_flow_drafts"
  on public.ins_flow_drafts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- DOWN
-- drop policy if exists "Service role bypass on ins_flow_drafts" on public.ins_flow_drafts;
-- drop table if exists public.ins_flow_drafts;
