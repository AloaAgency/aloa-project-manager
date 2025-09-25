-- Reset and fix unread counts to only show truly unread messages
-- This ensures we're not counting ALL messages, just unread ones

-- First, reset ALL unread counts to 0 to start fresh
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0;

-- Drop the old trigger that might be causing issues
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages;
DROP FUNCTION IF EXISTS update_chat_unread_counts();

-- Create an improved function that only increments for new messages
CREATE OR REPLACE FUNCTION update_chat_unread_counts_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
  conversation_project_id uuid;
BEGIN
  -- Only process if this is a new message (not an edit)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get sender's role to determine which side they're on
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Update conversation's last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id
  RETURNING project_id INTO conversation_project_id;

  -- Only increment the opposite side's unread count
  -- Don't add to existing count if it's already been reset
  IF sender_role ILIKE '%client%' THEN
    -- Client sent message, increment agency unread count by 1
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;
  ELSE
    -- Agency sent message, increment client unread count by 1
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for new messages only
CREATE TRIGGER trigger_update_unread_on_new_message
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = false)
EXECUTE FUNCTION update_chat_unread_counts_on_new_message();

-- Create or replace the function to properly mark messages as read and reset counts
CREATE OR REPLACE FUNCTION mark_all_messages_read_for_user(
  p_project_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  user_role text;
  conv_record RECORD;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM aloa_user_profiles
  WHERE id = p_user_id;

  -- Reset the appropriate unread count for ALL conversations in the project
  IF user_role ILIKE '%client%' THEN
    -- Client is reading, reset all client unread counts for this project
    UPDATE aloa_chat_conversations
    SET unread_count_client = 0
    WHERE project_id = p_project_id;
  ELSE
    -- Agency is reading, reset all agency unread counts for this project
    UPDATE aloa_chat_conversations
    SET unread_count_agency = 0
    WHERE project_id = p_project_id;
  END IF;

  -- Mark all messages as read by inserting read receipts
  -- This ensures future calculations are correct
  FOR conv_record IN
    SELECT DISTINCT c.id as conversation_id
    FROM aloa_chat_conversations c
    WHERE c.project_id = p_project_id
  LOOP
    -- Insert read receipts for all unread messages in this conversation
    INSERT INTO aloa_chat_read_receipts (message_id, user_id, read_at)
    SELECT m.id, p_user_id, NOW()
    FROM aloa_chat_messages m
    WHERE m.conversation_id = conv_record.conversation_id
      AND m.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM aloa_chat_read_receipts r
        WHERE r.message_id = m.id AND r.user_id = p_user_id
      )
    ON CONFLICT (message_id, user_id) DO UPDATE
    SET read_at = NOW();
  END LOOP;

  -- Update participant's last_read_at for all conversations
  UPDATE aloa_chat_participants
  SET last_read_at = NOW()
  WHERE user_id = p_user_id
    AND conversation_id IN (
      SELECT id FROM aloa_chat_conversations
      WHERE project_id = p_project_id
    );
END;
$$ LANGUAGE plpgsql;

-- Now, let's properly calculate the ACTUAL unread counts based on read receipts
-- This will fix the current incorrect counts
DO $$
DECLARE
  conv_record RECORD;
  msg_record RECORD;
  unread_for_clients integer;
  unread_for_agency integer;
BEGIN
  -- For each conversation, calculate the true unread counts
  FOR conv_record IN
    SELECT id, project_id
    FROM aloa_chat_conversations
  LOOP
    unread_for_clients := 0;
    unread_for_agency := 0;

    -- Count messages that haven't been read by ANY user of each side
    FOR msg_record IN
      SELECT m.id, m.sender_id, up.role as sender_role
      FROM aloa_chat_messages m
      JOIN aloa_user_profiles up ON m.sender_id = up.id
      WHERE m.conversation_id = conv_record.id
        AND m.is_deleted = false
    LOOP
      -- Check if this message has been read by at least one person from the opposite side
      IF msg_record.sender_role ILIKE '%client%' THEN
        -- Message from client - check if any agency member has read it
        IF NOT EXISTS (
          SELECT 1
          FROM aloa_chat_read_receipts r
          JOIN aloa_user_profiles u ON r.user_id = u.id
          WHERE r.message_id = msg_record.id
            AND u.role NOT ILIKE '%client%'
        ) THEN
          unread_for_agency := unread_for_agency + 1;
        END IF;
      ELSE
        -- Message from agency - check if any client has read it
        IF NOT EXISTS (
          SELECT 1
          FROM aloa_chat_read_receipts r
          JOIN aloa_user_profiles u ON r.user_id = u.id
          WHERE r.message_id = msg_record.id
            AND u.role ILIKE '%client%'
        ) THEN
          unread_for_clients := unread_for_clients + 1;
        END IF;
      END IF;
    END LOOP;

    -- Update the conversation with the correct counts
    UPDATE aloa_chat_conversations
    SET unread_count_client = unread_for_clients,
        unread_count_agency = unread_for_agency
    WHERE id = conv_record.id;
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION update_chat_unread_counts_on_new_message() IS 'Increments unread count for the opposite party when a new message is sent';
COMMENT ON FUNCTION mark_all_messages_read_for_user(uuid, uuid) IS 'Marks all messages as read for a user in a project and resets unread counts';