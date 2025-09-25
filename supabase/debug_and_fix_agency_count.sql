-- Debug why agency isn't seeing client messages

-- 1. Check if the trigger exists and is enabled
SELECT
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'aloa_chat_messages'::regclass
  AND tgname = 'on_new_chat_message';

-- 2. Check what role the client users have
SELECT
  id,
  full_name,
  role,
  CASE
    WHEN role ILIKE '%client%' THEN 'IS CLIENT'
    ELSE 'IS AGENCY'
  END as role_type
FROM aloa_user_profiles
WHERE role IS NOT NULL
ORDER BY role;

-- 3. Check current conversation counts
SELECT
  c.id,
  c.title,
  c.unread_count_client,
  c.unread_count_agency,
  c.last_message_at
FROM aloa_chat_conversations c
WHERE c.project_id IS NOT NULL;

-- 4. Drop and recreate the trigger with better logging
DROP TRIGGER IF EXISTS on_new_chat_message ON aloa_chat_messages;
DROP FUNCTION IF EXISTS increment_unread_on_new_message();

-- 5. Create an improved function with better role detection
CREATE OR REPLACE FUNCTION increment_unread_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
  is_client_sender boolean;
BEGIN
  -- Only process INSERT
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get sender's role
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Check if sender is a client (any role containing 'client')
  is_client_sender := (sender_role ILIKE '%client%');

  -- Update last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment the OPPOSITE side's count
  IF is_client_sender THEN
    -- Client sent message, increment AGENCY's unread
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;

    RAISE NOTICE 'Client message sent, incrementing agency count';
  ELSE
    -- Agency sent message, increment CLIENT's unread
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;

    RAISE NOTICE 'Agency message sent, incrementing client count';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the trigger
CREATE TRIGGER on_new_chat_message
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = false OR NEW.is_deleted IS NULL)
EXECUTE FUNCTION increment_unread_on_new_message();

-- 7. Test by manually incrementing agency count to see if it shows up
UPDATE aloa_chat_conversations
SET unread_count_agency = 1
WHERE id = (
  SELECT id FROM aloa_chat_conversations
  WHERE project_id IS NOT NULL
  LIMIT 1
);

-- 8. Check the result
SELECT
  c.id,
  c.title,
  c.unread_count_client as client_unread,
  c.unread_count_agency as agency_unread
FROM aloa_chat_conversations c
WHERE c.project_id IS NOT NULL;