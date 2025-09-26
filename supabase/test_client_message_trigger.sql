-- Test the trigger by simulating a client message

-- 1. First, check current agency unread count
SELECT
  id,
  title,
  unread_count_agency,
  unread_count_client
FROM aloa_chat_conversations
WHERE id = '1f79af19-fb57-4ae3-a1f7-f77b442b7104';

-- 2. Insert a test message from the client user (Test Jenkins)
INSERT INTO aloa_chat_messages (
  conversation_id,
  sender_id,
  content,
  is_deleted
) VALUES (
  '1f79af19-fb57-4ae3-a1f7-f77b442b7104',
  'f2f59869-d1e9-4cb3-b371-3f7ec6c01aca', -- Test Jenkins (client_admin)
  'Test message from client to trigger agency count',
  false
);

-- 3. Check if agency count increased
SELECT
  id,
  title,
  unread_count_agency,
  unread_count_client
FROM aloa_chat_conversations
WHERE id = '1f79af19-fb57-4ae3-a1f7-f77b442b7104';

-- 4. If it didn't increase, let's check the Postgres logs for our debug RAISE NOTICE statements
-- These would show in the Supabase logs

-- 5. Let's also verify the trigger is actually enabled
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_chat_messages'::regclass
  AND t.tgname = 'on_new_chat_message';

-- 6. Check if there are ANY triggers on the messages table
SELECT
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'A' THEN 'ALWAYS'
    WHEN 'R' THEN 'REPLICA'
  END as status
FROM pg_trigger
WHERE tgrelid = 'aloa_chat_messages'::regclass
  AND NOT tgisinternal;