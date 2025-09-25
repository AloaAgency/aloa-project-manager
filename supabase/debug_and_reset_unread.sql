-- Debug: Check what's in the unread counts right now
SELECT
  id,
  project_id,
  title,
  unread_count_client,
  unread_count_agency,
  last_message_at
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL
ORDER BY last_message_at DESC;

-- FORCE RESET all unread counts to 0
-- This should clear the "8 messages" issue
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0
WHERE 1=1; -- Force update all rows

-- Verify the reset worked
SELECT
  id,
  project_id,
  title,
  unread_count_client,
  unread_count_agency
FROM aloa_chat_conversations
WHERE project_id IS NOT NULL;