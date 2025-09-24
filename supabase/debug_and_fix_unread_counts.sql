-- Debug and fix unread count issues
-- The problem: unread counts are showing total messages, not actually unread messages

-- First, let's check what's actually in the tables
SELECT
    c.id,
    c.title,
    c.unread_count_client,
    c.unread_count_agency,
    (SELECT COUNT(*) FROM aloa_chat_messages m WHERE m.conversation_id = c.id) as total_messages,
    (SELECT COUNT(*)
     FROM aloa_chat_messages m
     WHERE m.conversation_id = c.id
     AND m.sender_id IN (
         SELECT u.id FROM aloa_user_profiles u
         WHERE u.role IN ('client', 'client_admin', 'client_participant')
     )) as client_sent_messages,
    (SELECT COUNT(*)
     FROM aloa_chat_messages m
     WHERE m.conversation_id = c.id
     AND m.sender_id IN (
         SELECT u.id FROM aloa_user_profiles u
         WHERE u.role NOT IN ('client', 'client_admin', 'client_participant')
     )) as agency_sent_messages
FROM aloa_chat_conversations c;

-- Check read receipts
SELECT
    m.id as message_id,
    m.conversation_id,
    m.sender_id,
    m.created_at,
    u.role as sender_role,
    (SELECT COUNT(*) FROM aloa_chat_read_receipts r WHERE r.message_id = m.id) as read_receipt_count
FROM aloa_chat_messages m
JOIN aloa_user_profiles u ON u.id = m.sender_id
ORDER BY m.created_at DESC;

-- The fix: Reset all unread counts to 0 first
UPDATE aloa_chat_conversations
SET unread_count_client = 0,
    unread_count_agency = 0;

-- Now create a proper function to handle marking messages as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Get user's role
    SELECT role INTO v_user_role
    FROM aloa_user_profiles
    WHERE id = p_user_id;

    -- Insert read receipts for all unread messages in this conversation
    INSERT INTO aloa_chat_read_receipts (message_id, user_id, read_at)
    SELECT m.id, p_user_id, NOW()
    FROM aloa_chat_messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != p_user_id
      AND NOT EXISTS (
          SELECT 1 FROM aloa_chat_read_receipts r
          WHERE r.message_id = m.id AND r.user_id = p_user_id
      )
    ON CONFLICT (message_id, user_id) DO NOTHING;

    -- Reset the appropriate unread counter to 0
    IF v_user_role IN ('client', 'client_admin', 'client_participant') THEN
        UPDATE aloa_chat_conversations
        SET unread_count_client = 0
        WHERE id = p_conversation_id;
    ELSE
        UPDATE aloa_chat_conversations
        SET unread_count_agency = 0
        WHERE id = p_conversation_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler trigger for new messages that only increments for the OTHER side
CREATE OR REPLACE FUNCTION increment_unread_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_role TEXT;
BEGIN
    -- Get sender's role
    SELECT role INTO sender_role
    FROM aloa_user_profiles
    WHERE id = NEW.sender_id;

    -- Update conversation - increment ONLY the other side's counter
    IF sender_role IN ('client', 'client_admin', 'client_participant') THEN
        -- Client sent message, increment ONLY agency unread count
        UPDATE aloa_chat_conversations
        SET
            last_message_at = NEW.created_at,
            unread_count_agency = unread_count_agency + 1
        WHERE id = NEW.conversation_id;
    ELSE
        -- Agency sent message, increment ONLY client unread count
        UPDATE aloa_chat_conversations
        SET
            last_message_at = NEW.created_at,
            unread_count_client = unread_count_client + 1
        WHERE id = NEW.conversation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger with the simpler function
DROP TRIGGER IF EXISTS trigger_update_conversation ON aloa_chat_messages;
CREATE TRIGGER trigger_update_conversation
    AFTER INSERT ON aloa_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_unread_on_new_message();

-- Create a trigger that resets count when ALL messages are read
CREATE OR REPLACE FUNCTION reset_unread_on_read_receipt()
RETURNS TRIGGER AS $$
DECLARE
    reader_role TEXT;
    conversation_id UUID;
    unread_count INTEGER;
BEGIN
    -- Get reader's role
    SELECT role INTO reader_role
    FROM aloa_user_profiles
    WHERE id = NEW.user_id;

    -- Get conversation_id from message
    SELECT m.conversation_id INTO conversation_id
    FROM aloa_chat_messages m
    WHERE m.id = NEW.message_id;

    -- Count remaining unread messages for this user
    SELECT COUNT(*)
    INTO unread_count
    FROM aloa_chat_messages m
    WHERE m.conversation_id = conversation_id
      AND m.sender_id != NEW.user_id
      AND NOT EXISTS (
          SELECT 1 FROM aloa_chat_read_receipts r
          WHERE r.message_id = m.id AND r.user_id = NEW.user_id
      );

    -- If no more unread messages, reset the counter
    IF unread_count = 0 THEN
        IF reader_role IN ('client', 'client_admin', 'client_participant') THEN
            UPDATE aloa_chat_conversations
            SET unread_count_client = 0
            WHERE id = conversation_id;
        ELSE
            UPDATE aloa_chat_conversations
            SET unread_count_agency = 0
            WHERE id = conversation_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the read receipt trigger
DROP TRIGGER IF EXISTS trigger_reset_unread ON aloa_chat_read_receipts;
CREATE TRIGGER trigger_reset_unread
    AFTER INSERT ON aloa_chat_read_receipts
    FOR EACH ROW
    EXECUTE FUNCTION reset_unread_on_read_receipt();

-- Test: Check the current state after fixes
SELECT
    c.id,
    c.title,
    c.unread_count_client,
    c.unread_count_agency,
    'Should be 0 after reset' as expected
FROM aloa_chat_conversations c;