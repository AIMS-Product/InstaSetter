-- P5.02 creative-level downstream funnel.
-- Creates the per-conversation grain view that powers /dashboard/reports/creatives.
-- Stacks on top of P5.01 (20260505000000_marketing_sources_utm.sql) — needs the
-- utm_* / ad_id / ad_set_id / landing_page_url columns on conversation_attributions.
-- Soft-depends on p3-close-handoff/01 (close_crm_id is already in the schema; the
-- column is just unpopulated until P3.01 wires the actual Close API push).
--
-- Strictly additive: no tables, columns, or indexes are dropped or altered. The
-- view is a regular view (NOT materialized) — at <30k conversations Postgres
-- aggregates this in <100ms with the existing indexes; revisit materialization
-- when conversation volume crosses ~250k. Page-level aggregation is delegated to
-- the service so we keep the per-conversation grain auditable from the SQL side.

CREATE OR REPLACE VIEW public.v_creative_funnel AS
SELECT
  c.id                                 AS conversation_id,
  c.started_at                         AS started_at,
  ca.source_id,
  ms.label                             AS source_label,
  ca.channel,
  ca.utm_source,
  ca.utm_medium,
  ca.utm_campaign,
  ca.utm_content,
  ca.utm_term,
  ca.ad_id,
  ca.ad_set_id,
  -- 'qualified' uses the existing qualification_status enum on leads. Sofia's
  -- definition: hot + warm count. Cold and out_of_area are excluded so the
  -- funnel reflects genuine commercial intent, not raw chat volume. The
  -- column tooltip on the report page mirrors this language.
  COALESCE(l.qualification_status IN ('hot', 'warm'), false) AS is_qualified,
  -- 'booked' is the presence of any lead_events row with tool_name='book_call'
  -- on the same conversation. EXISTS is faster than a join + DISTINCT here.
  EXISTS (
    SELECT 1 FROM public.lead_events le
    WHERE le.conversation_id = c.id AND le.tool_name = 'book_call'
  ) AS is_booked,
  -- 'sent to close' is leads.close_crm_id IS NOT NULL. The column is
  -- additive in the existing schema; until P3.01 lands, it stays NULL for
  -- every row and the report renders "—" / "Close not wired yet" gracefully.
  COALESCE(l.close_crm_id IS NOT NULL, false) AS is_sent_to_close
FROM public.conversations c
LEFT JOIN public.conversation_attributions ca ON ca.conversation_id = c.id
LEFT JOIN public.marketing_sources ms ON ms.id = ca.source_id
-- LATERAL keeps us at one row per conversation even if multiple `leads` rows
-- ever appeared on the same conversation (today there is at most one, but the
-- LATERAL+ORDER BY gives us a stable winner if that ever changes).
LEFT JOIN LATERAL (
  SELECT qualification_status, close_crm_id
  FROM public.leads
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) l ON true
WHERE c.is_test = false;

-- Service role is the only writer/reader on this surface (the report page
-- runs server-side via the service-role client, mirroring dashboard-metrics).
GRANT SELECT ON public.v_creative_funnel TO service_role;
