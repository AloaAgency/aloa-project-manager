-- SAFE VERSION: Disable ONLY chat-related triggers and functions

-- 1. Show current triggers on chat tables
SELECT
  c.relname as table_name,
  t.tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('aloa_chat_messages', 'aloa_chat_conversations', 'aloa_chat_participants', 'aloa_chat_read_receipts')
  AND t.tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY c.relname, t.tgname;

-- 2. DISABLE ALL TRIGGERS on chat tables only
ALTER TABLE aloa_chat_messages DISABLE TRIGGER USER;
ALTER TABLE aloa_chat_conversations DISABLE TRIGGER USER;
ALTER TABLE aloa_chat_participants DISABLE TRIGGER USER;
ALTER TABLE aloa_chat_read_receipts DISABLE TRIGGER USER;

-- 3. DROP only chat-specific functions
DROP FUNCTION IF EXISTS update_chat_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS increment_unread_count() CASCADE;
DROP FUNCTION IF EXISTS simple_increment_unread() CASCADE;
DROP FUNCTION IF EXISTS mark_all_messages_read_for_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_conversation_messages_read(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reset_unread_for_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS recalculate_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS chat_message_inserted() CASCADE;

-- 4. DROP any existing chat triggers by name
DROP TRIGGER IF EXISTS trigger_update_chat_unread_counts ON aloa_chat_messages;
DROP TRIGGER IF EXISTS trigger_update_unread_on_new_message ON aloa_chat_messages;
DROP TRIGGER IF EXISTS trigger_increment_unread ON aloa_chat_messages;
DROP TRIGGER IF EXISTS chat_message_inserted ON aloa_chat_messages;
DROP TRIGGER IF EXISTS update_chat_metadata_trigger ON aloa_chat_messages;

-- 5. FORCE RESET to exactly 0
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0,
    updated_at = NOW();

-- 6. Create a MINIMAL function ONLY for marking as read
CREATE OR REPLACE FUNCTION mark_all_messages_read_for_user(
  p_project_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  user_role text;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM aloa_user_profiles WHERE id = p_user_id;

  -- Just set to 0, nothing else
  IF user_role ILIKE '%client%' THEN
    UPDATE aloa_chat_conversations SET unread_count_client = 0 WHERE project_id = p_project_id;
  ELSE
    UPDATE aloa_chat_conversations SET unread_count_agency = 0 WHERE project_id = p_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Verify everything is at 0
SELECT
  id,
  title,
  unread_count_client,
  unread_count_agency,
  last_message_at
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL;

-- 8. Show remaining active triggers (should be none on chat tables)
SELECT
  c.relname as table_name,
  t.tgname as trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN ('aloa_chat_messages', 'aloa_chat_conversations')
  AND t.tgname NOT LIKE 'RI_%'
ORDER BY c.relname;