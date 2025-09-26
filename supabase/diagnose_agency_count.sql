-- Diagnose why agency isn't seeing client messages

-- 1. Check the actual unread counts in the database
SELECT
  id,
  title,
  project_id,
  unread_count_client,
  unread_count_agency,
  last_message_at
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL
ORDER BY last_message_at DESC;

-- 2. Manually set agency count to 1 for testing
UPDATE aloa_chat_conversations
SET unread_count_agency = 1
WHERE project_id IS NOT NULL
  AND id = (SELECT id FROM aloa_chat_conversations WHERE project_id IS NOT NULL LIMIT 1);

-- 3. Check again to see if the update worked
SELECT
  id,
  title,
  unread_count_client,
  unread_count_agency
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL;

-- 4. Check user roles to understand detection
SELECT
  id,
  full_name,
  role,
  CASE
    WHEN role ILIKE '%client%' THEN 'CLIENT'
    WHEN role IS NULL THEN 'NO ROLE'
    ELSE 'AGENCY'
  END as detected_type
FROM aloa_user_profiles
WHERE role IS NOT NULL
ORDER BY role;

-- 5. Test: Simulate inserting a message from a client user
-- First find a client user ID and conversation ID
SELECT
  up.id as user_id,
  up.full_name,
  up.role,
  cc.id as conversation_id,
  cc.title
FROM aloa_user_profiles up
CROSS JOIN aloa_chat_conversations cc
WHERE up.role ILIKE '%client%'
  AND cc.project_id IS NOT NULL
LIMIT 1;