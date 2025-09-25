-- Simple fix: Just reset counts to 0 and don't try to track old messages
-- Only count NEW messages going forward

-- 1. Reset ALL unread counts to 0 - clean slate
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0;

-- 2. Drop any existing triggers that might be interfering
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages;
DROP TRIGGER IF EXISTS trigger_update_unread_on_new_message ON aloa_chat_messages;
DROP FUNCTION IF EXISTS update_chat_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts_on_new_message() CASCADE;

-- 3. Create a SIMPLE trigger that ONLY increments on NEW messages
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
BEGIN
  -- Get sender's role
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Update last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment the OPPOSITE side's unread count by exactly 1
  IF sender_role ILIKE '%client%' THEN
    -- Client sent message, increment agency's unread
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;
  ELSE
    -- Agency sent message, increment client's unread
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger ONLY for INSERT (new messages)
CREATE TRIGGER trigger_increment_unread
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = false)
EXECUTE FUNCTION increment_unread_count();

-- 5. Simplify the mark as read function - just reset to 0
CREATE OR REPLACE FUNCTION reset_unread_for_user(
  p_project_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM aloa_user_profiles
  WHERE id = p_user_id;

  -- Simply reset the appropriate unread count to 0
  IF user_role ILIKE '%client%' THEN
    -- Client is reading, reset client unread count to 0
    UPDATE aloa_chat_conversations
    SET unread_count_client = 0
    WHERE project_id = p_project_id;
  ELSE
    -- Agency is reading, reset agency unread count to 0
    UPDATE aloa_chat_conversations
    SET unread_count_agency = 0
    WHERE project_id = p_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Clean up any old functions that might be interfering
DROP FUNCTION IF EXISTS mark_all_messages_read_for_user(uuid, uuid);
DROP FUNCTION IF EXISTS mark_conversation_messages_read(uuid, uuid);

-- 7. Rename our simple function to match what the API expects
ALTER FUNCTION reset_unread_for_user(uuid, uuid)
RENAME TO mark_all_messages_read_for_user;

-- 8. Clear all read receipts to start fresh
TRUNCATE TABLE aloa_chat_read_receipts;

-- 9. Clear participant last_read_at to start fresh
UPDATE aloa_chat_participants
SET last_read_at = NULL;

COMMENT ON FUNCTION increment_unread_count() IS 'Simple function that increments unread count by 1 for new messages';
COMMENT ON FUNCTION mark_all_messages_read_for_user(uuid, uuid) IS 'Simple function that resets unread count to 0 when user opens chat';