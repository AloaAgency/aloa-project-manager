-- Fix chat unread count mechanism
-- This migration ensures that unread counts are tracked properly for both agency and client sides

-- First, let's create a function to update unread counts when new messages are inserted
CREATE OR REPLACE FUNCTION update_chat_unread_counts()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
BEGIN
  -- Get sender's role to determine which side they're on
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Update conversation's last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  -- Update unread counts based on sender's role
  -- If sender is a client (role contains 'client'), increment agency's unread count
  -- If sender is agency (role doesn't contain 'client'), increment client's unread count
  IF sender_role ILIKE '%client%' THEN
    -- Client sent message, increment agency unread count
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;
  ELSE
    -- Agency sent message, increment client unread count
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages;

-- Create trigger for new messages
CREATE TRIGGER trigger_update_chat_unread_counts
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_unread_counts();

-- Create a function to mark messages as read when they're fetched
CREATE OR REPLACE FUNCTION mark_conversation_messages_read(
  p_conversation_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM aloa_user_profiles
  WHERE id = p_user_id;

  -- Reset the appropriate unread count based on user's role
  IF user_role ILIKE '%client%' THEN
    -- Client is reading, reset client unread count
    UPDATE aloa_chat_conversations
    SET unread_count_client = 0
    WHERE id = p_conversation_id;
  ELSE
    -- Agency is reading, reset agency unread count
    UPDATE aloa_chat_conversations
    SET unread_count_agency = 0
    WHERE id = p_conversation_id;
  END IF;

  -- Update participant's last_read_at
  UPDATE aloa_chat_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
ON aloa_chat_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_unread_client
ON aloa_chat_conversations(project_id, unread_count_client);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_unread_agency
ON aloa_chat_conversations(project_id, unread_count_agency);

-- Reset all unread counts to ensure clean state
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0;

-- Recalculate unread counts based on existing messages and read receipts
-- This ensures accurate counts for existing data
WITH unread_counts AS (
  SELECT
    m.conversation_id,
    COUNT(CASE
      WHEN sender.role ILIKE '%client%'
        AND NOT EXISTS (
          SELECT 1 FROM aloa_chat_read_receipts r
          JOIN aloa_user_profiles u ON r.user_id = u.id
          WHERE r.message_id = m.id
            AND u.role NOT ILIKE '%client%'
        )
      THEN 1
    END) as agency_unread,
    COUNT(CASE
      WHEN sender.role NOT ILIKE '%client%'
        AND NOT EXISTS (
          SELECT 1 FROM aloa_chat_read_receipts r
          JOIN aloa_user_profiles u ON r.user_id = u.id
          WHERE r.message_id = m.id
            AND u.role ILIKE '%client%'
        )
      THEN 1
    END) as client_unread
  FROM aloa_chat_messages m
  JOIN aloa_user_profiles sender ON m.sender_id = sender.id
  WHERE m.is_deleted = false
  GROUP BY m.conversation_id
)
UPDATE aloa_chat_conversations c
SET
  unread_count_agency = uc.agency_unread,
  unread_count_client = uc.client_unread
FROM unread_counts uc
WHERE c.id = uc.conversation_id;

COMMENT ON FUNCTION update_chat_unread_counts() IS 'Updates unread message counts when new messages are sent';
COMMENT ON FUNCTION mark_conversation_messages_read(uuid, uuid) IS 'Marks all messages in a conversation as read for a specific user';