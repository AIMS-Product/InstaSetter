-- Add provider-neutral message ID tracking for already-applied databases.
-- Fresh databases already receive this column from the core domain migration.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS external_message_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_external_message_id_key'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_external_message_id_key UNIQUE (external_message_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_external_message_id
  ON public.messages (external_message_id);
