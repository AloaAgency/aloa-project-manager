-- Fix Row Level Security for Chat Tables WITHOUT RECURSION
-- This version avoids circular dependencies that cause infinite recursion

-- First, ensure RLS is enabled on all tables
ALTER TABLE aloa_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations for their projects" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Super admins can view all conversations" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Super admins can create any conversation" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON aloa_chat_conversations;

DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can send messages to conversations they participate in" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Super admins can manage all messages" ON aloa_chat_messages;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON aloa_chat_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON aloa_chat_participants;
DROP POLICY IF EXISTS "Super admins can manage all participants" ON aloa_chat_participants;

DROP POLICY IF EXISTS "Users can view their own read receipts" ON aloa_chat_read_receipts;
DROP POLICY IF EXISTS "Users can create their own read receipts" ON aloa_chat_read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON aloa_chat_read_receipts;

DROP POLICY IF EXISTS "Users can view typing indicators in their conversations" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can create their own typing indicators" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can delete their own typing indicators" ON aloa_chat_typing_indicators;

-- ===================================
-- SIMPLIFIED APPROACH - Start with participants table
-- ===================================

-- 1. PARTICIPANTS TABLE - No recursion, simple direct checks
CREATE POLICY "participants_select"
ON aloa_chat_participants FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "participants_insert"
ON aloa_chat_participants FOR INSERT
WITH CHECK (
    -- Allow if user is creating the conversation (checked via created_by)
    EXISTS (
        SELECT 1 FROM aloa_chat_conversations
        WHERE id = conversation_id
        AND created_by = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- 2. CONVERSATIONS TABLE - Check participants without recursion
CREATE POLICY "conversations_select"
ON aloa_chat_conversations FOR SELECT
USING (
    -- User is a participant (direct check, no recursion)
    id IN (
        SELECT conversation_id
        FROM aloa_chat_participants
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "conversations_insert"
ON aloa_chat_conversations FOR INSERT
WITH CHECK (
    -- User must be a project member or super admin
    EXISTS (
        SELECT 1 FROM aloa_project_members
        WHERE project_id = aloa_chat_conversations.project_id
        AND user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "conversations_update"
ON aloa_chat_conversations FOR UPDATE
USING (
    created_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- 3. MESSAGES TABLE
CREATE POLICY "messages_select"
ON aloa_chat_messages FOR SELECT
USING (
    -- Check if user is participant via conversation_id
    conversation_id IN (
        SELECT conversation_id
        FROM aloa_chat_participants
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "messages_insert"
ON aloa_chat_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND
    conversation_id IN (
        SELECT conversation_id
        FROM aloa_chat_participants
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "messages_update"
ON aloa_chat_messages FOR UPDATE
USING (
    sender_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "messages_delete"
ON aloa_chat_messages FOR DELETE
USING (
    sender_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- 4. READ RECEIPTS TABLE
CREATE POLICY "read_receipts_select"
ON aloa_chat_read_receipts FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "read_receipts_insert"
ON aloa_chat_read_receipts FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "read_receipts_update"
ON aloa_chat_read_receipts FOR UPDATE
USING (
    user_id = auth.uid()
);

-- 5. TYPING INDICATORS TABLE
CREATE POLICY "typing_select"
ON aloa_chat_typing_indicators FOR SELECT
USING (
    conversation_id IN (
        SELECT conversation_id
        FROM aloa_chat_participants
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

CREATE POLICY "typing_insert"
ON aloa_chat_typing_indicators FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND
    conversation_id IN (
        SELECT conversation_id
        FROM aloa_chat_participants
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "typing_update"
ON aloa_chat_typing_indicators FOR UPDATE
USING (
    user_id = auth.uid()
);

CREATE POLICY "typing_delete"
ON aloa_chat_typing_indicators FOR DELETE
USING (
    user_id = auth.uid()
);

-- Grant necessary permissions
GRANT ALL ON aloa_chat_conversations TO authenticated;
GRANT ALL ON aloa_chat_messages TO authenticated;
GRANT ALL ON aloa_chat_participants TO authenticated;
GRANT ALL ON aloa_chat_read_receipts TO authenticated;
GRANT ALL ON aloa_chat_typing_indicators TO authenticated;

-- Success message
SELECT 'Chat RLS policies created successfully WITHOUT RECURSION. No more infinite loops!' as status;