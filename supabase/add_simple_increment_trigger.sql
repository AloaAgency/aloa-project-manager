-- Add back ONLY a simple trigger for NEW messages

-- 1. Create a very simple increment function
CREATE OR REPLACE FUNCTION increment_unread_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
BEGIN
  -- Only process INSERT (new messages)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get sender's role
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Update last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment the opposite side's count by 1
  IF sender_role ILIKE '%client%' THEN
    -- Client sent message, increment agency's unread by 1
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;
  ELSE
    -- Agency sent message, increment client's unread by 1
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a single trigger for new messages
CREATE TRIGGER on_new_chat_message
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = false)
EXECUTE FUNCTION increment_unread_on_new_message();

-- 3. Test: Check current counts (should still be 0 or whatever they are now)
SELECT
  id,
  title,
  unread_count_client,
  unread_count_agency,
  last_message_at
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL;