-- Fix agency unread count not showing client messages

-- 1. First, drop ALL existing triggers on chat tables (CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS on_new_chat_message ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_update_conversation ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS chat_message_inserted ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_update_unread_on_new_message ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS trigger_increment_unread ON aloa_chat_messages CASCADE;
DROP TRIGGER IF EXISTS update_chat_metadata_trigger ON aloa_chat_messages CASCADE;

-- 2. Drop ALL existing functions (CASCADE to remove dependencies)
DROP FUNCTION IF EXISTS increment_unread_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS simple_increment_unread() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS increment_unread_count() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_metadata() CASCADE;
DROP FUNCTION IF EXISTS recalculate_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS chat_message_inserted() CASCADE;

-- 3. Check current user roles to understand the data
SELECT
  id,
  full_name,
  role,
  CASE
    WHEN role ILIKE '%client%' THEN 'CLIENT'
    ELSE 'AGENCY'
  END as role_type
FROM aloa_user_profiles
WHERE role IS NOT NULL
ORDER BY role;

-- 4. Reset all counts to 0 to start fresh
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0
WHERE 1=1;

-- 5. Create a SINGLE, SIMPLE function that increments correctly
CREATE OR REPLACE FUNCTION increment_unread_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_role text;
  is_client_sender boolean;
BEGIN
  -- Only process INSERT (new messages)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Skip deleted messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  -- Get sender's role
  SELECT role INTO sender_role
  FROM aloa_user_profiles
  WHERE id = NEW.sender_id;

  -- Debug logging
  RAISE NOTICE 'New message from user % with role: %', NEW.sender_id, sender_role;

  -- Determine if sender is a client
  is_client_sender := (sender_role ILIKE '%client%');

  -- Update last_message_at
  UPDATE aloa_chat_conversations
  SET last_message_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment the OPPOSITE side's count
  IF is_client_sender THEN
    -- Client sent message, increment AGENCY's unread count
    UPDATE aloa_chat_conversations
    SET unread_count_agency = COALESCE(unread_count_agency, 0) + 1
    WHERE id = NEW.conversation_id;

    RAISE NOTICE 'Client message - incrementing agency count for conversation %', NEW.conversation_id;
  ELSE
    -- Agency sent message, increment CLIENT's unread count
    UPDATE aloa_chat_conversations
    SET unread_count_client = COALESCE(unread_count_client, 0) + 1
    WHERE id = NEW.conversation_id;

    RAISE NOTICE 'Agency message - incrementing client count for conversation %', NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a SINGLE trigger for new messages
CREATE TRIGGER on_new_chat_message
AFTER INSERT ON aloa_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = false OR NEW.is_deleted IS NULL)
EXECUTE FUNCTION increment_unread_on_new_message();

-- 7. Keep the mark as read function for when users open the chat
CREATE OR REPLACE FUNCTION mark_all_messages_read_for_user(
  p_project_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM aloa_user_profiles WHERE id = p_user_id;

  -- Reset the appropriate counter to 0
  IF user_role ILIKE '%client%' THEN
    UPDATE aloa_chat_conversations
    SET unread_count_client = 0
    WHERE project_id = p_project_id;
  ELSE
    UPDATE aloa_chat_conversations
    SET unread_count_agency = 0
    WHERE project_id = p_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Verify the setup
SELECT
  c.id,
  c.title,
  c.unread_count_client,
  c.unread_count_agency,
  c.last_message_at,
  c.project_id
FROM aloa_chat_conversations c
WHERE c.project_id IS NOT NULL
ORDER BY c.last_message_at DESC;

-- 9. Test: Send a test message from a client user to see if agency count increments
-- First, find a client user and a conversation
SELECT
  cm.sender_id,
  up.full_name,
  up.role,
  cm.conversation_id,
  cc.title
FROM aloa_chat_messages cm
JOIN aloa_user_profiles up ON cm.sender_id = up.id
JOIN aloa_chat_conversations cc ON cm.conversation_id = cc.id
WHERE up.role ILIKE '%client%'
LIMIT 5;

-- 10. Check that the trigger exists and is enabled
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_chat_messages'::regclass
  AND t.tgname = 'on_new_chat_message';