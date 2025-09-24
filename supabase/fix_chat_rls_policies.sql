-- Fix Row Level Security for Chat Tables
-- This script creates proper RLS policies for the chat system

-- ===================================
-- aloa_chat_conversations policies
-- ===================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations for their projects" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Super admins can view all conversations" ON aloa_chat_conversations;
DROP POLICY IF EXISTS "Super admins can create any conversation" ON aloa_chat_conversations;

-- View policies
CREATE POLICY "Users can view conversations they participate in"
ON aloa_chat_conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM aloa_chat_participants
        WHERE conversation_id = aloa_chat_conversations.id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Super admins can view all conversations"
ON aloa_chat_conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Create policies
CREATE POLICY "Users can create conversations for their projects"
ON aloa_chat_conversations FOR INSERT
WITH CHECK (
    -- User must be a member of the project OR a super admin
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

CREATE POLICY "Super admins can create any conversation"
ON aloa_chat_conversations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Update policies
CREATE POLICY "Users can update their own conversations"
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

-- ===================================
-- aloa_chat_messages policies
-- ===================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can send messages to conversations they participate in" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON aloa_chat_messages;
DROP POLICY IF EXISTS "Super admins can manage all messages" ON aloa_chat_messages;

-- View policy
CREATE POLICY "Users can view messages in conversations they participate in"
ON aloa_chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM aloa_chat_participants
        WHERE conversation_id = aloa_chat_messages.conversation_id
        AND user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Create policy
CREATE POLICY "Users can send messages to conversations they participate in"
ON aloa_chat_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND
    (
        EXISTS (
            SELECT 1 FROM aloa_chat_participants
            WHERE conversation_id = aloa_chat_messages.conversation_id
            AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    )
);

-- Update policy
CREATE POLICY "Users can update their own messages"
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

-- Delete policy
CREATE POLICY "Users can delete their own messages"
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

-- Super admin policy
CREATE POLICY "Super admins can manage all messages"
ON aloa_chat_messages FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- ===================================
-- aloa_chat_participants policies
-- ===================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON aloa_chat_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON aloa_chat_participants;
DROP POLICY IF EXISTS "Super admins can manage all participants" ON aloa_chat_participants;

-- View policy
CREATE POLICY "Users can view participants in their conversations"
ON aloa_chat_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM aloa_chat_participants p2
        WHERE p2.conversation_id = aloa_chat_participants.conversation_id
        AND p2.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Create policy
CREATE POLICY "Users can add participants to conversations they created"
ON aloa_chat_participants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_chat_conversations
        WHERE id = aloa_chat_participants.conversation_id
        AND created_by = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Super admin policy
CREATE POLICY "Super admins can manage all participants"
ON aloa_chat_participants FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- ===================================
-- aloa_chat_read_receipts policies
-- ===================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own read receipts" ON aloa_chat_read_receipts;
DROP POLICY IF EXISTS "Users can create their own read receipts" ON aloa_chat_read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON aloa_chat_read_receipts;

-- View policy
CREATE POLICY "Users can view their own read receipts"
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

-- Create policy
CREATE POLICY "Users can create their own read receipts"
ON aloa_chat_read_receipts FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

-- Update policy
CREATE POLICY "Users can update their own read receipts"
ON aloa_chat_read_receipts FOR UPDATE
USING (
    user_id = auth.uid()
);

-- ===================================
-- aloa_chat_typing_indicators policies
-- ===================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view typing indicators in their conversations" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can create their own typing indicators" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON aloa_chat_typing_indicators;
DROP POLICY IF EXISTS "Users can delete their own typing indicators" ON aloa_chat_typing_indicators;

-- View policy
CREATE POLICY "Users can view typing indicators in their conversations"
ON aloa_chat_typing_indicators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM aloa_chat_participants
        WHERE conversation_id = aloa_chat_typing_indicators.conversation_id
        AND user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Create policy
CREATE POLICY "Users can create their own typing indicators"
ON aloa_chat_typing_indicators FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
        SELECT 1 FROM aloa_chat_participants
        WHERE conversation_id = aloa_chat_typing_indicators.conversation_id
        AND user_id = auth.uid()
    )
);

-- Update policy
CREATE POLICY "Users can update their own typing indicators"
ON aloa_chat_typing_indicators FOR UPDATE
USING (
    user_id = auth.uid()
);

-- Delete policy
CREATE POLICY "Users can delete their own typing indicators"
ON aloa_chat_typing_indicators FOR DELETE
USING (
    user_id = auth.uid()
);

-- ===================================
-- Verify RLS is enabled
-- ===================================
ALTER TABLE aloa_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON aloa_chat_conversations TO authenticated;
GRANT ALL ON aloa_chat_messages TO authenticated;
GRANT ALL ON aloa_chat_participants TO authenticated;
GRANT ALL ON aloa_chat_read_receipts TO authenticated;
GRANT ALL ON aloa_chat_typing_indicators TO authenticated;

-- Success message
SELECT 'Chat RLS policies created successfully. Users can now create and view conversations.' as status;