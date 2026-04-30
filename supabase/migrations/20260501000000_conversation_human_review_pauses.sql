-- P1.03 Skeptical playbook — per-conversation human-review pauses.
--
-- The bot can call the new `request_human_review` tool when a conversation
-- escalates beyond what a peer-mentor reply can address. The engine writes a
-- row here, future inbounds on that conversation short-circuit until an
-- operator clears the pause from the dashboard.
--
-- Table is additive; no impact on existing reads/writes. RLS service-role
-- only — anon clients never read or write pauses.

create table if not exists public.conversation_human_review_pauses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text not null,
  severity text not null default 'concern' check (severity in ('concern', 'hostile', 'compliance')),
  requested_by text not null default 'bot' check (requested_by in ('bot', 'operator')),
  requested_at timestamptz not null default now(),
  cleared_at timestamptz,
  cleared_by text
);

-- Active-pause lookup is per-conversation; the partial index keeps it cheap
-- regardless of cleared rows that accumulate over time.
create index if not exists idx_human_review_pauses_active
  on public.conversation_human_review_pauses (conversation_id)
  where cleared_at is null;

create index if not exists idx_human_review_pauses_requested_at
  on public.conversation_human_review_pauses (requested_at desc);

alter table public.conversation_human_review_pauses enable row level security;

drop policy if exists "service_role manages human review pauses"
  on public.conversation_human_review_pauses;

create policy "service_role manages human review pauses"
  on public.conversation_human_review_pauses
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
