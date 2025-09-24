import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/chat/[projectId]/unread - Get total unread count for user
export async function GET(request, { params }) {
  const supabase = await createClient();
  const { projectId } = params;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role
    const { data: userProfile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isClientRole = userProfile?.role?.includes('client');
    const unreadField = isClientRole ? 'unread_count_client' : 'unread_count_agency';

    // Get total unread count across all conversations
    const { data: conversations, error } = await supabase
      .from('aloa_chat_conversations')
      .select(`id, ${unreadField}`)
      .eq('project_id', projectId)
      .gt(unreadField, 0);

    if (error) throw error;

    // Calculate total unread
    const totalUnread = conversations?.reduce((sum, conv) => sum + (conv[unreadField] || 0), 0) || 0;

    return NextResponse.json({
      unreadCount: totalUnread,
      hasUnread: totalUnread > 0
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
  }
}