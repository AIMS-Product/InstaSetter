-- Add per-flow conversation scope and runtime pause controls for operators.

alter table public.conversations
  add column if not exists flow_id text;

update public.conversations
set flow_id = 'ig-organic-dm'
where flow_id is null;

create index if not exists conversations_flow_id_started_at_idx
  on public.conversations (flow_id, started_at desc);

create table if not exists public.flow_runtime_controls (
  flow_id text primary key,
  bot_paused boolean not null default false,
  paused_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.flow_runtime_controls enable row level security;

drop policy if exists "Service role can manage flow runtime controls"
  on public.flow_runtime_controls;

create policy "Service role can manage flow runtime controls"
  on public.flow_runtime_controls
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
