-- Core domain tables for InstaSetter
-- contacts, conversations, messages, leads, integration_events

-- ============================================================
-- contacts
-- ============================================================
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  inro_contact_id     text not null,
  instagram_handle    text not null,
  name                text,
  email               text,
  phone               text,
  profile_picture_url text,
  source              text not null default 'organic_dm',
  opted_out           boolean not null default false,
  opted_out_at        timestamptz,
  first_seen_at       timestamptz not null default now(),
  last_message_at     timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint contacts_inro_contact_id_key unique (inro_contact_id),
  constraint contacts_instagram_handle_key unique (instagram_handle)
);

create index idx_contacts_inro_contact_id on public.contacts (inro_contact_id);
create index idx_contacts_instagram_handle on public.contacts (instagram_handle);

alter table public.contacts enable row level security;

create policy "Service role bypass on contacts"
  on public.contacts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- conversations
-- ============================================================
create table public.conversations (
  id                  uuid primary key default gen_random_uuid(),
  contact_id          uuid not null references public.contacts (id) on delete cascade,
  status              text not null default 'active',
  prompt_version      text not null,
  summary             text,
  flagged_reason      text,
  is_test             boolean not null default false,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_conversations_contact_id on public.conversations (contact_id);
create index idx_conversations_status on public.conversations (status);

alter table public.conversations enable row level security;

create policy "Service role bypass on conversations"
  on public.conversations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- messages
-- ============================================================
create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations (id) on delete cascade,
  role                text not null,
  content             text not null,
  inro_message_id     text,
  dedup_hash          text,
  token_count         integer,
  metadata            jsonb,
  created_at          timestamptz not null default now(),

  constraint messages_inro_message_id_key unique (inro_message_id),
  constraint messages_dedup_hash_key unique (dedup_hash)
);

create index idx_messages_conversation_id on public.messages (conversation_id);
create index idx_messages_inro_message_id on public.messages (inro_message_id);
create index idx_messages_dedup_hash on public.messages (dedup_hash);

alter table public.messages enable row level security;

create policy "Service role bypass on messages"
  on public.messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- leads
-- ============================================================
create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  contact_id            uuid not null references public.contacts (id) on delete cascade,
  conversation_id       uuid not null references public.conversations (id) on delete cascade,
  instagram_handle      text not null,
  qualification_status  text not null default 'cold',
  machine_count         integer,
  location_type         text,
  revenue_range         text,
  call_booked           boolean not null default false,
  calendly_slot         timestamptz,
  calculator_sent       boolean not null default false,
  key_notes             text,
  recommended_action    text,
  call_outcome          text,
  call_outcome_notes    text,
  call_outcome_at       timestamptz,
  close_crm_id          text,
  customerio_id         text,
  name                  text,
  email                 text,
  summary_json          jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_leads_contact_id on public.leads (contact_id);
create index idx_leads_conversation_id on public.leads (conversation_id);
create index idx_leads_qualification_status on public.leads (qualification_status);

alter table public.leads enable row level security;

create policy "Service role bypass on leads"
  on public.leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- integration_events
-- ============================================================
create table public.integration_events (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid references public.leads (id) on delete set null,
  contact_id          uuid references public.contacts (id) on delete set null,
  conversation_id     uuid references public.conversations (id) on delete set null,
  integration         text not null,
  action              text not null,
  status              text not null default 'pending',
  payload             jsonb,
  request_payload     jsonb,
  response_payload    jsonb,
  error_message       text,
  created_at          timestamptz not null default now()
);

create index idx_integration_events_lead_id on public.integration_events (lead_id);
create index idx_integration_events_contact_id on public.integration_events (contact_id);
create index idx_integration_events_status on public.integration_events (status);

alter table public.integration_events enable row level security;

create policy "Service role bypass on integration_events"
  on public.integration_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
