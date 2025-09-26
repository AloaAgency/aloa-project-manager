import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/chat/[projectId]/mark-read - Mark all conversations as read
export async function POST(request, { params }) {
  const supabase = await createClient();
  const { projectId } = params;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the database function that properly marks messages as read
    // and resets unread counts
    const { error: markReadError } = await supabase.rpc(
      'mark_all_messages_read_for_user',
      {
        p_project_id: projectId,
        p_user_id: user.id
      }
    );

    if (markReadError) {
      console.error('Error marking messages as read:', markReadError);
      throw markReadError;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking conversations as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}