-- Add tags array column to contacts for qualification state tracking.
-- Tags are synced bidirectionally with SendPulse and injected into the
-- system prompt so the LLM can see what's already known about a contact.

ALTER TABLE contacts ADD COLUMN tags text[] DEFAULT '{}';
