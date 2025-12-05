import { NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';
import { notifyCommunicationCreated } from '@/lib/communicationNotifications';
import { extractCommunicationKnowledge } from '@/lib/knowledge/communicationsExtractor';

function parsePagination(searchParams) {
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

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
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const direction = searchParams.get('direction');
  const { limit, offset, page } = parsePagination(searchParams);

  try {
    let query = supabase
      .from('aloa_communications')
      .select(`
        id,
        project_id,
        projectlet_id,
        applet_id,
        direction,
        created_by,
        assigned_to,
        title,
        description,
        category,
        status,
        priority,
        due_date,
        attachments,
        metadata,
        created_at,
        updated_at,
        acknowledged_at,
        completed_at,
        read_status:aloa_communication_read_status!left(user_id.eq.${user.id})(last_read_at, last_message_count),
        messages:aloa_communication_messages(count)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .or('metadata->>deleted.is.null,metadata->>deleted.eq.false')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (direction) {
      query = query.eq('direction', direction);
    }

    const { data, error, count } = await query;
    if (error) {
      return handleSupabaseError(error, 'Failed to fetch communications');
    }

    const communications = (data || []).map((item) => {
      const messageCount = item.messages?.[0]?.count || 0;
      const readRow = item.read_status?.[0];
      const lastReadCount = readRow?.last_message_count || 0;
      const unreadCount = Math.max(messageCount - lastReadCount, 0);

      return {
        ...item,
        unread_count: unreadCount,
        last_read_at: readRow?.last_read_at || null
      };
    });

    return NextResponse.json({
      communications,
      page,
      total: count || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = params;
  const validationError = validateUuid(projectId, 'projectId');
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase, user, role } = authContext;
  const isAdmin = ADMIN_ROLES.includes(role) || role === 'team_member';

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      direction,
      assignedTo,
      priority = 'medium',
      dueDate,
      attachments = [],
      metadata = {},
      projectletId,
      appletId
    } = body || {};

    if (!title || !category || !direction) {
      return NextResponse.json(
        { error: 'title, category, and direction are required' },
        { status: 400 }
      );
    }

    // Non-admins can only create client_to_admin communications
    if (!isAdmin && direction !== 'client_to_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const insertPayload = {
      project_id: projectId,
      projectlet_id: projectletId || null,
      applet_id: appletId || null,
      direction,
      created_by: user.id,
      assigned_to: Array.isArray(assignedTo) && isAdmin ? assignedTo : [],
      title,
      description: description || null,
      category,
      status: 'open',
      priority,
      due_date: dueDate || null,
      attachments,
      metadata
    };

    const { data, error } = await supabase
      .from('aloa_communications')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to create communication');
    }

    // Fire and forget notifications / knowledge extraction
    notifyCommunicationCreated({ projectId, communication: data, creator: user.id });
    if (direction === 'client_to_admin') {
      extractCommunicationKnowledge(data, []);
    }

    return NextResponse.json({ communication: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create communication' }, { status: 500 });
  }
}
