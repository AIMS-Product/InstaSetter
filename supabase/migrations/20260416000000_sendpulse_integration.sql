-- SendPulse integration: add sendpulse_contact_id, make inro_contact_id nullable

-- Allow contacts without an Inro ID (SendPulse contacts won't have one)
ALTER TABLE public.contacts ALTER COLUMN inro_contact_id DROP NOT NULL;

-- Add SendPulse contact ID with unique constraint
ALTER TABLE public.contacts ADD COLUMN sendpulse_contact_id text;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_sendpulse_contact_id_key UNIQUE (sendpulse_contact_id);
CREATE INDEX idx_contacts_sendpulse_contact_id
  ON public.contacts (sendpulse_contact_id);
