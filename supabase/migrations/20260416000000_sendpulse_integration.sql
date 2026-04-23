-- SendPulse integration: add sendpulse_contact_id

-- Add SendPulse contact ID with unique constraint
ALTER TABLE public.contacts ADD COLUMN sendpulse_contact_id text;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_sendpulse_contact_id_key UNIQUE (sendpulse_contact_id);
CREATE INDEX idx_contacts_sendpulse_contact_id
  ON public.contacts (sendpulse_contact_id);
