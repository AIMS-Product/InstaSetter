-- ManyChat data schema for InstaSetter
-- Stores synced ManyChat subscriber data, tags, flows, and custom fields

-- ============================================================
-- Tags
-- ============================================================
create table mc_tags (
  id        bigint primary key,            -- ManyChat tag ID
  name      text not null,
  synced_at timestamptz not null default now()
);

-- ============================================================
-- Custom field definitions
-- ============================================================
create table mc_custom_fields (
  id          bigint primary key,            -- ManyChat custom field ID
  name        text not null,
  type        text not null,                 -- text, number, date, etc.
  description text default '',
  synced_at   timestamptz not null default now()
);

-- ============================================================
-- Flows (automations)
-- ============================================================
create table mc_flows (
  ns        text primary key,               -- ManyChat flow namespace
  name      text not null,
  folder_id bigint default 0,
  synced_at timestamptz not null default now()
);

-- ============================================================
-- Flow folders
-- ============================================================
create table mc_flow_folders (
  id        bigint primary key,
  name      text not null,
  parent_id bigint default 0,
  synced_at timestamptz not null default now()
);

-- ============================================================
-- Growth tools
-- ============================================================
create table mc_growth_tools (
  id        bigint primary key,
  name      text not null,
  type      text not null,                  -- feed_comment_trigger, etc.
  synced_at timestamptz not null default now()
);

-- ============================================================
-- Bot-level fields
-- ============================================================
create table mc_bot_fields (
  id          bigint primary key,
  name        text not null,
  type        text not null,
  description text default '',
  value       text,                          -- stored as text, cast at app level
  synced_at   timestamptz not null default now()
);

-- ============================================================
-- Contacts (subscribers)
-- ============================================================
create table mc_contacts (
  id                   text primary key,     -- ManyChat subscriber ID (string)
  manychat_status      text not null default 'active',
  first_name           text,
  last_name            text,
  name                 text,
  gender               text,
  profile_pic          text,
  locale               text,
  language             text,
  timezone             text,
  live_chat_url        text,
  last_input_text      text,

  -- Phone
  phone                text,
  optin_phone          boolean default false,

  -- Email
  email                text,
  optin_email          boolean default false,

  -- Instagram
  ig_username          text,
  ig_id                bigint,
  ig_last_interaction  timestamptz,
  ig_last_seen         timestamptz,

  -- WhatsApp
  whatsapp_phone       text,
  optin_whatsapp       boolean default false,

  -- General timestamps
  subscribed           timestamptz,
  last_interaction     timestamptz,
  last_seen            timestamptz,
  is_followup_enabled  boolean default true,

  -- Sync metadata
  synced_at            timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Index for common lookups
create index mc_contacts_ig_username_idx on mc_contacts (ig_username);
create index mc_contacts_email_idx on mc_contacts (email) where email is not null;
create index mc_contacts_phone_idx on mc_contacts (phone) where phone is not null;
create index mc_contacts_manychat_status_idx on mc_contacts (manychat_status);

-- ============================================================
-- Contact <-> Tag junction
-- ============================================================
create table mc_contact_tags (
  contact_id text    not null references mc_contacts (id) on delete cascade,
  tag_id     bigint  not null references mc_tags (id) on delete cascade,
  synced_at  timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index mc_contact_tags_tag_idx on mc_contact_tags (tag_id);

-- ============================================================
-- Contact custom field values
-- ============================================================
create table mc_contact_custom_fields (
  contact_id text   not null references mc_contacts (id) on delete cascade,
  field_id   bigint not null references mc_custom_fields (id) on delete cascade,
  value      text,                           -- stored as text, cast at app level
  synced_at  timestamptz not null default now(),
  primary key (contact_id, field_id)
);

create index mc_contact_custom_fields_field_idx on mc_contact_custom_fields (field_id);

-- ============================================================
-- RLS — default deny, service role only for now (webhook/sync)
-- ============================================================
alter table mc_tags enable row level security;
alter table mc_custom_fields enable row level security;
alter table mc_flows enable row level security;
alter table mc_flow_folders enable row level security;
alter table mc_growth_tools enable row level security;
alter table mc_bot_fields enable row level security;
alter table mc_contacts enable row level security;
alter table mc_contact_tags enable row level security;
alter table mc_contact_custom_fields enable row level security;

-- Service role bypass (used by sync scripts and webhooks)
create policy "Service role full access" on mc_tags for all using (true) with check (true);
create policy "Service role full access" on mc_custom_fields for all using (true) with check (true);
create policy "Service role full access" on mc_flows for all using (true) with check (true);
create policy "Service role full access" on mc_flow_folders for all using (true) with check (true);
create policy "Service role full access" on mc_growth_tools for all using (true) with check (true);
create policy "Service role full access" on mc_bot_fields for all using (true) with check (true);
create policy "Service role full access" on mc_contacts for all using (true) with check (true);
create policy "Service role full access" on mc_contact_tags for all using (true) with check (true);
create policy "Service role full access" on mc_contact_custom_fields for all using (true) with check (true);
