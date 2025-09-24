-- Fix unread count logic for chat messages
-- This ensures unread counts accurately reflect unread messages, not total messages

-- First, let's create an improved function that calculates unread counts properly
CREATE OR REPLACE FUNCTION calculate_actual_unread_count(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_unread_count INTEGER;
    v_user_role TEXT;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM aloa_user_profiles
    WHERE id = p_user_id;

    -- Count messages that:
    -- 1. Are in this conversation
    -- 2. Were NOT sent by the current user
    -- 3. Don't have a read receipt from the current user
    SELECT COUNT(*)
    INTO v_unread_count
    FROM aloa_chat_messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != p_user_id
      AND NOT EXISTS (
          SELECT 1
          FROM aloa_chat_read_receipts r
          WHERE r.message_id = m.id
            AND r.user_id = p_user_id
      );

    RETURN v_unread_count;
END;
$$ LANGUAGE plpgsql;

-- Improved function to update unread counts when a message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_role TEXT;
    v_unread_count_client INTEGER := 0;
    v_unread_count_agency INTEGER := 0;
    v_client_user_id UUID;
    v_agency_user_id UUID;
BEGIN
    -- Get sender's role
    SELECT role INTO sender_role
    FROM aloa_user_profiles
    WHERE id = NEW.sender_id;

    -- Get all participants in this conversation
    FOR v_client_user_id IN
        SELECT p.user_id
        FROM aloa_chat_participants p
        JOIN aloa_user_profiles u ON u.id = p.user_id
        WHERE p.conversation_id = NEW.conversation_id
          AND u.role IN ('client', 'client_admin', 'client_participant')
          AND p.user_id != NEW.sender_id
    LOOP
        -- Count unread messages for each client user
        v_unread_count_client := GREATEST(
            v_unread_count_client,
            calculate_actual_unread_count(NEW.conversation_id, v_client_user_id)
        );
    END LOOP;

    FOR v_agency_user_id IN
        SELECT p.user_id
        FROM aloa_chat_participants p
        JOIN aloa_user_profiles u ON u.id = p.user_id
        WHERE p.conversation_id = NEW.conversation_id
          AND u.role NOT IN ('client', 'client_admin', 'client_participant')
          AND p.user_id != NEW.sender_id
    LOOP
        -- Count unread messages for each agency user
        v_unread_count_agency := GREATEST(
            v_unread_count_agency,
            calculate_actual_unread_count(NEW.conversation_id, v_agency_user_id)
        );
    END LOOP;

    -- Update conversation with actual unread counts
    UPDATE aloa_chat_conversations
    SET
        last_message_at = NEW.created_at,
        unread_count_client = v_unread_count_client,
        unread_count_agency = v_unread_count_agency
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Improved function to update unread counts when messages are read
CREATE OR REPLACE FUNCTION reset_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
    reader_role TEXT;
    conversation_id UUID;
    v_unread_count INTEGER;
BEGIN
    -- Get reader's role
    SELECT role INTO reader_role
    FROM aloa_user_profiles
    WHERE id = NEW.user_id;

    -- Get conversation_id from message
    SELECT m.conversation_id INTO conversation_id
    FROM aloa_chat_messages m
    WHERE m.id = NEW.message_id;

    -- Calculate the actual unread count for this user
    v_unread_count := calculate_actual_unread_count(conversation_id, NEW.user_id);

    -- Update the appropriate unread count based on role
    IF reader_role IN ('client', 'client_admin', 'client_participant') THEN
        -- Only update if this client has no more unread messages
        IF v_unread_count = 0 THEN
            UPDATE aloa_chat_conversations
            SET unread_count_client = 0
            WHERE id = conversation_id;
        ELSE
            UPDATE aloa_chat_conversations
            SET unread_count_client = v_unread_count
            WHERE id = conversation_id;
        END IF;
    ELSE
        -- Agency member
        IF v_unread_count = 0 THEN
            UPDATE aloa_chat_conversations
            SET unread_count_agency = 0
            WHERE id = conversation_id;
        ELSE
            UPDATE aloa_chat_conversations
            SET unread_count_agency = v_unread_count
            WHERE id = conversation_id;
        END IF;
    END IF;

    -- Update participant's last_read_at
    UPDATE aloa_chat_participants
    SET last_read_at = NOW()
    WHERE conversation_id = conversation_id
      AND user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_conversation ON aloa_chat_messages;
DROP TRIGGER IF EXISTS trigger_reset_unread ON aloa_chat_read_receipts;

-- Recreate triggers with the improved functions
CREATE TRIGGER trigger_update_conversation
    AFTER INSERT ON aloa_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

CREATE TRIGGER trigger_reset_unread
    AFTER INSERT ON aloa_chat_read_receipts
    FOR EACH ROW
    EXECUTE FUNCTION reset_unread_count_on_read();

-- Fix current unread counts by recalculating them
DO $$
DECLARE
    v_conversation RECORD;
    v_client_count INTEGER;
    v_agency_count INTEGER;
BEGIN
    -- Loop through all conversations
    FOR v_conversation IN
        SELECT id FROM aloa_chat_conversations
    LOOP
        v_client_count := 0;
        v_agency_count := 0;

        -- Calculate unread for client users
        FOR v_client_count IN
            SELECT MAX(calculate_actual_unread_count(v_conversation.id, p.user_id))
            FROM aloa_chat_participants p
            JOIN aloa_user_profiles u ON u.id = p.user_id
            WHERE p.conversation_id = v_conversation.id
              AND u.role IN ('client', 'client_admin', 'client_participant')
        LOOP
            -- Max value is stored
        END LOOP;

        -- Calculate unread for agency users
        FOR v_agency_count IN
            SELECT MAX(calculate_actual_unread_count(v_conversation.id, p.user_id))
            FROM aloa_chat_participants p
            JOIN aloa_user_profiles u ON u.id = p.user_id
            WHERE p.conversation_id = v_conversation.id
              AND u.role NOT IN ('client', 'client_admin', 'client_participant')
        LOOP
            -- Max value is stored
        END LOOP;

        -- Update the conversation with correct counts
        UPDATE aloa_chat_conversations
        SET
            unread_count_client = COALESCE(v_client_count, 0),
            unread_count_agency = COALESCE(v_agency_count, 0)
        WHERE id = v_conversation.id;
    END LOOP;
END $$;

-- Verify the fix
SELECT
    c.id,
    c.title,
    c.unread_count_client,
    c.unread_count_agency,
    (SELECT COUNT(*)
     FROM aloa_chat_messages m
     WHERE m.conversation_id = c.id) as total_messages
FROM aloa_chat_conversations c;