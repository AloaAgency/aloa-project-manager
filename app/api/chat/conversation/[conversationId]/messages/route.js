import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/chat/conversation/[conversationId]/messages - Get messages for a conversation
export async function GET(request, { params }) {
  const supabase = await createClient();
  const { conversationId } = params;

  // Get pagination params from query string
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is participant
    const { data: participantCheck } = await supabase
      .from('aloa_chat_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participantCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages with sender info and read receipts
    const { data: messages, error, count } = await supabase
      .from('aloa_chat_messages')
      .select(`
        *,
        sender:aloa_user_profiles(
          id,
          full_name,
          email,
          role
        ),
        read_receipts:aloa_chat_read_receipts(
          user_id,
          read_at
        )
      `, { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Mark messages as read
    const unreadMessageIds = messages
      .filter(msg =>
        msg.sender_id !== user.id &&
        !msg.read_receipts?.some(r => r.user_id === user.id)
      )
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      const readReceipts = unreadMessageIds.map(messageId => ({
        message_id: messageId,
        user_id: user.id
      }));

      await supabase
        .from('aloa_chat_read_receipts')
        .upsert(readReceipts, { onConflict: 'message_id,user_id' });
    }

    // Reverse messages for correct display order (newest at bottom)
    messages.reverse();

    return NextResponse.json({
      messages,
      total_count: count,
      has_more: offset + limit < count
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/chat/conversation/[conversationId]/messages - Send a new message
export async function POST(request, { params }) {
  const supabase = await createClient();
  const { conversationId } = params;
  const body = await request.json();
  const { content, type = 'text', attachments = [] } = body;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is participant
    const { data: participantCheck } = await supabase
      .from('aloa_chat_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!participantCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('aloa_chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: type,
        content,
        attachments
      })
      .select(`
        *,
        sender:aloa_user_profiles(
          id,
          full_name,
          email,
          role
        )
      `)
      .single();

    if (error) throw error;

    // Queue message for knowledge extraction
    await queueMessageForExtraction(message, conversationId);

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// Helper function to queue chat messages for knowledge extraction
async function queueMessageForExtraction(message, conversationId) {
  try {
    const supabase = await createClient();

    // Get project ID from conversation
    const { data: conversation } = await supabase
      .from('aloa_chat_conversations')
      .select('project_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    // Queue for extraction
    await supabase
      .from('aloa_knowledge_extraction_queue')
      .insert({
        project_id: conversation.project_id,
        source_type: 'chat_message',
        source_id: message.id,
        priority: 3, // Medium priority
        data: {
          message_id: message.id,
          conversation_id: conversationId,
          content: message.content,
          sender_id: message.sender_id,
          sender_name: message.sender?.full_name,
          sender_role: message.sender?.role,
          attachments: message.attachments
        }
      });

  } catch (error) {
    console.error('Error queueing message for extraction:', error);
    // Don't fail the message send if extraction queue fails
  }
}

// DELETE /api/chat/conversation/[conversationId]/messages - Soft delete a message
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { conversationId } = params;
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the message
    const { data: message } = await supabase
      .from('aloa_chat_messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (!message || message.sender_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete the message
    const { error } = await supabase
      .from('aloa_chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}

// PATCH /api/chat/conversation/[conversationId]/messages - Edit a message
export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { conversationId } = params;
  const body = await request.json();
  const { messageId, content } = body;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the message
    const { data: message } = await supabase
      .from('aloa_chat_messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (!message || message.sender_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Edit the message
    const { data: updatedMessage, error } = await supabase
      .from('aloa_chat_messages')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        *,
        sender:aloa_user_profiles(
          id,
          full_name,
          email,
          role
        )
      `)
      .single();

    if (error) throw error;

    // Queue edited message for re-extraction
    await queueMessageForExtraction(updatedMessage, conversationId);

    return NextResponse.json({ message: updatedMessage });

  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
  }
}