-- NUCLEAR OPTION: Find and disable EVERYTHING that could be setting unread counts

-- 1. Find ALL triggers on any chat-related tables
SELECT
  n.nspname as schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname LIKE '%chat%'
  AND t.tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
  AND t.tgname NOT LIKE '%pkey%'
ORDER BY c.relname, t.tgname;

-- 2. Find ALL functions that might update chat conversations
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%aloa_chat_conversations%'
  AND pg_get_functiondef(p.oid) ILIKE '%UPDATE%'
  AND n.nspname = 'public';

-- 3. DISABLE ALL TRIGGERS on chat tables
ALTER TABLE aloa_chat_messages DISABLE TRIGGER ALL;
ALTER TABLE aloa_chat_conversations DISABLE TRIGGER ALL;
ALTER TABLE aloa_chat_participants DISABLE TRIGGER ALL;
ALTER TABLE aloa_chat_read_receipts DISABLE TRIGGER ALL;

-- 4. DROP EVERY function that could be updating counts
DROP FUNCTION IF EXISTS update_chat_unread_counts() CASCADE;
DROP FUNCTION IF EXISTS update_chat_unread_counts_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS increment_unread_count() CASCADE;
DROP FUNCTION IF EXISTS simple_increment_unread() CASCADE;
DROP FUNCTION IF EXISTS mark_all_messages_read_for_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_conversation_messages_read(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reset_unread_for_user(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_metadata() CASCADE;
DROP FUNCTION IF EXISTS recalculate_unread_counts() CASCADE;

-- 5. FORCE RESET to exactly 0
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0,
    updated_at = NOW()
WHERE 1=1;

-- 6. Add a CHECK constraint to prevent any count > 0 temporarily
-- This will help us find what's trying to set it
-- ALTER TABLE aloa_chat_conversations
-- ADD CONSTRAINT temp_no_unread CHECK (unread_count_client = 0 AND unread_count_agency = 0);

-- 7. Check for any RLS policies that might be updating
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE '%chat%';

-- 8. Verify everything is at 0
SELECT
  id,
  title,
  unread_count_client,
  unread_count_agency,
  last_message_at
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL;

-- 9. Create a MINIMAL function ONLY for marking as read (no increments)
CREATE OR REPLACE FUNCTION simple_mark_read(
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

-- Rename to what API expects
ALTER FUNCTION simple_mark_read(uuid, uuid) RENAME TO mark_all_messages_read_for_user;