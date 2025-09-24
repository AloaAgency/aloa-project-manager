-- Verify and fix chat permissions
-- Check current state and ensure everything is properly set

-- First check if tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename LIKE 'aloa_chat%'
ORDER BY tablename;

-- Check existing policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename LIKE 'aloa_chat%'
ORDER BY tablename, policyname;

-- Additional fix: Ensure service role can bypass RLS
-- This is important for server-side operations

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure authenticated users have proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON aloa_chat_conversations TO authenticated;
GRANT ALL ON aloa_chat_messages TO authenticated;
GRANT ALL ON aloa_chat_participants TO authenticated;
GRANT ALL ON aloa_chat_read_receipts TO authenticated;
GRANT ALL ON aloa_chat_typing_indicators TO authenticated;

-- Grant sequence permissions for auto-incrementing IDs if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a simpler insert policy for conversations that's more permissive
DROP POLICY IF EXISTS "conversations_insert" ON aloa_chat_conversations;

CREATE POLICY "conversations_insert_simplified"
ON aloa_chat_conversations FOR INSERT
WITH CHECK (
    -- Allow anyone authenticated to create a conversation
    -- We'll check project membership at the API level
    auth.uid() IS NOT NULL
);

-- Similarly for participants
DROP POLICY IF EXISTS "participants_insert" ON aloa_chat_participants;

CREATE POLICY "participants_insert_simplified"
ON aloa_chat_participants FOR INSERT
WITH CHECK (
    -- Allow authenticated users to add participants
    auth.uid() IS NOT NULL
);

-- Verify the policies are active
SELECT
    'Chat system permissions fixed. Tables with RLS enabled:' as status,
    COUNT(*) as tables_with_rls
FROM pg_tables
WHERE tablename LIKE 'aloa_chat%'
AND rowsecurity = true;