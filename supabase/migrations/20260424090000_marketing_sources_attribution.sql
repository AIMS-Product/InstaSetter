CREATE TABLE public.marketing_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  label text NOT NULL,
  channel text NOT NULL,
  campaign text NOT NULL,
  material text NOT NULL,
  entry_action text NOT NULL,
  trigger_label text NOT NULL,
  post_url text,
  ad_id text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_sources_status
  ON public.marketing_sources (status, created_at DESC);

CREATE TABLE public.conversation_attributions (
  conversation_id uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.marketing_sources(id) ON DELETE SET NULL,
  source_key text,
  channel text,
  campaign text,
  material text,
  entry_action text,
  trigger_label text,
  raw_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_attributions_source_id
  ON public.conversation_attributions (source_id);

CREATE INDEX idx_conversation_attributions_source_key
  ON public.conversation_attributions (source_key);
