-- Find all triggers on aloa_chat_messages table
SELECT
  tgname as trigger_name,
  proname as function_name,
  tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_chat_messages'::regclass;

-- Find all triggers on aloa_chat_conversations table
SELECT
  tgname as trigger_name,
  proname as function_name,
  tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_chat_conversations'::regclass;

-- Disable ALL triggers on chat messages that might be recalculating
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_update_unread_on_new_message ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_increment_unread ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS update_chat_metadata_trigger ON aloa_chat_messages CASCADE;

-- Drop ALL functions that might be recalculating counts
DROP FUNCTION IF EXISTS update_chat_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS increment_unread_count() CASCADE;
DROP FUNCTION IF EXISTS update_chat_metadata() CASCADE;

-- Force reset to 0 again
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0;

-- Create a VERY SIMPLE trigger that ONLY works going forward
CREATE OR REPLACE FUNCTION simple_increment_unread()
RETURNS TRIGGER AS $$
BEGIN
  -- Only on INSERT of new messages
  IF TG_OP = 'INSERT' THEN
    -- Get sender role
    IF EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = NEW.sender_id
      AND role ILIKE '%client%'
    ) THEN
      -- Client sent, increment agency by 1
      UPDATE aloa_chat_conversations
      SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1,
          last_message_at = NOW()
      WHERE id = NEW.conversation_id;
    ELSE
      -- Agency sent, increment client by 1
      UPDATE aloa_chat_conversations
      SET unread_count_client = COALESCE(unread_count_client, 0) + 1,
          last_message_at = NOW()
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Single simple trigger
CREATE TRIGGER chat_message_inserted
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
EXECUTE FUNCTION simple_increment_unread();

-- Verify all counts are 0
SELECT id, title, unread_count_client, unread_count_agency
FROM aloa_chat_conversations;