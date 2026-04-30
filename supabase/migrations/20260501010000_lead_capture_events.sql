-- lead_capture_events: channel-agnostic record of an email being committed
-- to a magnet flow. One row per (email, source) capture. Distinct from
-- public.lead_events (per-tool-call audit) and public.integration_events
-- (per-integration call audit). This table is the unified capture-record that
-- a future delivery job (P2) reads to drive provider sends.
--
-- Reserved migration slot: P1 phase block, second slot (P1.03 holds
-- 20260501000000 if it ships first; P1.05 owns 20260501010000).
--
-- Spec: plans/dm-setter-roadmap/p1-trust-conversation/05-anthony-magnet.md

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_capture_source') then
    create type lead_capture_source as enum ('dm', 'landing_page', 'manual');
  end if;
end$$;

create table if not exists public.lead_capture_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source lead_capture_source not null,
  contact_id uuid references public.contacts (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  marketing_source_id uuid references public.marketing_sources (id) on delete set null,
  attribution jsonb,
  delivery_status text not null default 'pending'
    check (
      delivery_status in (
        'pending',
        'sent',
        'failed',
        'skipped',
        'manual_followup'
      )
    ),
  delivery_provider text,
  delivery_attempted_at timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_capture_events_email
  on public.lead_capture_events (lower(email));

create index if not exists idx_lead_capture_events_status
  on public.lead_capture_events (delivery_status);

create index if not exists idx_lead_capture_events_source
  on public.lead_capture_events (source, created_at desc);

alter table public.lead_capture_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lead_capture_events'
      and policyname = 'service_role manages lead capture events'
  ) then
    create policy "service_role manages lead capture events"
      on public.lead_capture_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;
