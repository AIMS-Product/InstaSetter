-- P5.01 UTM-style lead source tracking. Layers UTM identifiers on top of the
-- Apr 24 attribution baseline (20260424090000). Strictly additive — every
-- column is nullable text and every index is new. Existing rows continue to
-- function with NULL UTM values.

ALTER TABLE public.marketing_sources
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN utm_content text,
  ADD COLUMN utm_term text,
  ADD COLUMN ad_set_id text,
  ADD COLUMN landing_page_url text;

ALTER TABLE public.conversation_attributions
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN utm_content text,
  ADD COLUMN utm_term text,
  ADD COLUMN ad_set_id text,
  ADD COLUMN landing_page_url text,
  -- ad_id is mirrored onto attributions for conversations whose source
  -- resolves at webhook time (no source_id link), so creative-funnel
  -- reporting (P5.02) can group by ad_id without forcing a join.
  ADD COLUMN ad_id text;

CREATE INDEX idx_conversation_attributions_utm_source
  ON public.conversation_attributions (utm_source);
CREATE INDEX idx_conversation_attributions_utm_campaign
  ON public.conversation_attributions (utm_campaign);
CREATE INDEX idx_conversation_attributions_ad_id
  ON public.conversation_attributions (ad_id);
CREATE INDEX idx_conversation_attributions_ad_set_id
  ON public.conversation_attributions (ad_set_id);
