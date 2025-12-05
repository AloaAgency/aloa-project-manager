import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  const { projectId } = params;
  const validationError = validateUuid(projectId, 'projectId');
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase, user } = authContext;

  try {
    const { data, error } = await supabase
      .from('aloa_communications')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        direction,
        created_at,
        messages:aloa_communication_messages(count),
        read_status:aloa_communication_read_status!left(user_id.eq.${user.id})(last_message_count, last_read_at)
      `)
      .eq('project_id', projectId)
      .or('metadata->>deleted.is.null,metadata->>deleted.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'Failed to load unread communications');
    }

    const unread = (data || []).filter((item) => {
      const messageCount = item.messages?.[0]?.count || 0;
      const lastReadCount = item.read_status?.[0]?.last_message_count || 0;
      return messageCount > lastReadCount;
    }).map((item) => {
      const messageCount = item.messages?.[0]?.count || 0;
      const readRow = item.read_status?.[0];
      const lastReadCount = readRow?.last_message_count || 0;

      return {
        ...item,
        unread_count: Math.max(messageCount - lastReadCount, 0),
        last_read_at: readRow?.last_read_at || null
      };
    });

    return NextResponse.json({ communications: unread });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load unread communications' }, { status: 500 });
  }
}
