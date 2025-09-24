-- Create chat system tables for client-agency communication
-- All chat history is captured for AI agent knowledge extraction

-- Create enum for message status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
    END IF;
END $$;

-- Create enum for message type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('text', 'file', 'system');
    END IF;
END $$;

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS aloa_chat_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    created_by UUID REFERENCES aloa_user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    last_message_at TIMESTAMPTZ,
    unread_count_client INTEGER DEFAULT 0,
    unread_count_agency INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS aloa_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES aloa_chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    message_type message_type DEFAULT 'text',
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]', -- Array of {url, name, type, size}
    status message_status DEFAULT 'sent',
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- Can store mentions, reactions, etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat participants table (who can see which conversations)
CREATE TABLE IF NOT EXISTS aloa_chat_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES aloa_chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Create chat read receipts table
CREATE TABLE IF NOT EXISTS aloa_chat_read_receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES aloa_chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS aloa_chat_typing_indicators (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES aloa_chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 seconds',
    UNIQUE(conversation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project ON aloa_chat_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON aloa_chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON aloa_chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON aloa_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON aloa_chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON aloa_chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_message ON aloa_chat_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_conversation ON aloa_chat_typing_indicators(conversation_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_aloa_chat_conversations_updated_at
    BEFORE UPDATE ON aloa_chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aloa_chat_messages_updated_at
    BEFORE UPDATE ON aloa_chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aloa_chat_participants_updated_at
    BEFORE UPDATE ON aloa_chat_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at and unread counts
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_role TEXT;
BEGIN
    -- Get sender's role
    SELECT role INTO sender_role
    FROM aloa_user_profiles
    WHERE id = NEW.sender_id;

    -- Update conversation
    IF sender_role IN ('client', 'client_admin', 'client_participant') THEN
        -- Client sent message, increment agency unread count
        UPDATE aloa_chat_conversations
        SET
            last_message_at = NEW.created_at,
            unread_count_agency = unread_count_agency + 1
        WHERE id = NEW.conversation_id;
    ELSE
        -- Agency sent message, increment client unread count
        UPDATE aloa_chat_conversations
        SET
            last_message_at = NEW.created_at,
            unread_count_client = unread_count_client + 1
        WHERE id = NEW.conversation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
    AFTER INSERT ON aloa_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- Function to reset unread count when messages are read
CREATE OR REPLACE FUNCTION reset_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
    reader_role TEXT;
    conversation_id UUID;
BEGIN
    -- Get reader's role
    SELECT role INTO reader_role
    FROM aloa_user_profiles
    WHERE id = NEW.user_id;

    -- Get conversation_id from message
    SELECT m.conversation_id INTO conversation_id
    FROM aloa_chat_messages m
    WHERE m.id = NEW.message_id;

    -- Reset appropriate unread count
    IF reader_role IN ('client', 'client_admin', 'client_participant') THEN
        UPDATE aloa_chat_conversations
        SET unread_count_client = 0
        WHERE id = conversation_id;
    ELSE
        UPDATE aloa_chat_conversations
        SET unread_count_agency = 0
        WHERE id = conversation_id;
    END IF;

    -- Update participant's last_read_at
    UPDATE aloa_chat_participants
    SET last_read_at = NEW.read_at
    WHERE conversation_id = conversation_id AND user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_unread_on_read
    AFTER INSERT ON aloa_chat_read_receipts
    FOR EACH ROW
    EXECUTE FUNCTION reset_unread_count_on_read();

-- Function to automatically add project members as chat participants
CREATE OR REPLACE FUNCTION add_project_members_to_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Add all project members as participants
    INSERT INTO aloa_chat_participants (conversation_id, user_id)
    SELECT NEW.id, user_id
    FROM aloa_project_members
    WHERE project_id = NEW.project_id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_members_to_chat
    AFTER INSERT ON aloa_chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION add_project_members_to_chat();

-- Grant permissions
GRANT ALL ON aloa_chat_conversations TO authenticated;
GRANT ALL ON aloa_chat_messages TO authenticated;
GRANT ALL ON aloa_chat_participants TO authenticated;
GRANT ALL ON aloa_chat_read_receipts TO authenticated;
GRANT ALL ON aloa_chat_typing_indicators TO authenticated;

-- Add RLS policies (basic - should be enhanced based on security requirements)
ALTER TABLE aloa_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can see conversations they're participants in)
CREATE POLICY "Users can view their conversations" ON aloa_chat_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM aloa_chat_participants
            WHERE conversation_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations for their projects" ON aloa_chat_conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM aloa_project_members
            WHERE project_id = aloa_chat_conversations.project_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view messages in their conversations" ON aloa_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM aloa_chat_participants
            WHERE conversation_id = aloa_chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON aloa_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM aloa_chat_participants
            WHERE conversation_id = aloa_chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their participant records" ON aloa_chat_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create read receipts" ON aloa_chat_read_receipts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view read receipts" ON aloa_chat_read_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM aloa_chat_messages m
            JOIN aloa_chat_participants p ON p.conversation_id = m.conversation_id
            WHERE m.id = aloa_chat_read_receipts.message_id
            AND p.user_id = auth.uid()
        )
    );

-- Add sample data comment
COMMENT ON TABLE aloa_chat_conversations IS 'Stores chat conversations between clients and agency for each project';
COMMENT ON TABLE aloa_chat_messages IS 'Stores individual chat messages with full history for AI knowledge extraction';
COMMENT ON TABLE aloa_chat_participants IS 'Tracks who can access which conversations';
COMMENT ON TABLE aloa_chat_read_receipts IS 'Tracks message read status for each user';
COMMENT ON TABLE aloa_chat_typing_indicators IS 'Real-time typing indicators for chat';