-- lead_events: timeline of tool calls fired during a conversation.
-- One row per Anthropic tool_use block (capture_email, qualify_lead, book_call,
-- generate_summary). Enables funnel analytics and a transcript viewer that
-- renders tool firings inline with messages.

create table public.lead_events (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  contact_id       uuid not null references public.contacts (id) on delete cascade,
  message_id       uuid references public.messages (id) on delete set null,
  tool_name        text not null,
  tool_use_id      text,
  tool_input       jsonb not null default '{}'::jsonb,
  integration      text not null default 'unknown',
  created_at       timestamptz not null default now(),

  constraint lead_events_tool_use_id_key unique (tool_use_id)
);

create index idx_lead_events_conversation_id_created_at
  on public.lead_events (conversation_id, created_at);
create index idx_lead_events_contact_id_tool_name
  on public.lead_events (contact_id, tool_name);
create index idx_lead_events_tool_name_created_at
  on public.lead_events (tool_name, created_at);

alter table public.lead_events enable row level security;

create policy "Service role bypass on lead_events"
  on public.lead_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
