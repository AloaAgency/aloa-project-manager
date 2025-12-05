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
        status,
        due_date,
        priority,
        messages:aloa_communication_messages(count),
        read_status:aloa_communication_read_status!left(user_id.eq.${user.id})(last_message_count)
      `)
      .eq('project_id', projectId)
      .or('metadata->>deleted.is.null,metadata->>deleted.eq.false');

    if (error) {
      return handleSupabaseError(error, 'Failed to load stats');
    }

    const statusCounts = {};
    let overdue = 0;
    let unread = 0;

    const today = new Date();

    (data || []).forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;

      const messageCount = item.messages?.[0]?.count || 0;
      const lastReadCount = item.read_status?.[0]?.last_message_count || 0;
      if (messageCount > lastReadCount) {
        unread += 1;
      }

      if (item.due_date) {
        const dueDate = new Date(item.due_date);
        if (dueDate < today && ['open', 'acknowledged', 'in_progress', 'pending_review'].includes(item.status)) {
          overdue += 1;
        }
      }
    });

    return NextResponse.json({
      statusCounts,
      overdue,
      unread
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
