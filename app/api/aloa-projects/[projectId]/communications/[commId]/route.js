import { NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';

function validateParams(projectId, commId) {
  return validateUuid(projectId, 'projectId') || validateUuid(commId, 'communicationId');
}

export async function GET(request, { params }) {
  const { projectId, commId } = params;
  const validationError = validateParams(projectId, commId);
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase, user } = authContext;

  try {
    const { data: communication, error: commError } = await supabase
      .from('aloa_communications')
      .select(`
        *,
        read_status:aloa_communication_read_status!left(user_id.eq.${user.id})(last_read_at, last_message_count)
      `)
      .eq('project_id', projectId)
      .or('metadata->>deleted.is.null,metadata->>deleted.eq.false')
      .eq('id', commId)
      .maybeSingle();

    if (commError) {
      return handleSupabaseError(commError, 'Failed to fetch communication');
    }

    if (!communication) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('aloa_communication_messages')
      .select('*')
      .eq('communication_id', commId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return handleSupabaseError(msgError, 'Failed to fetch messages');
    }

    const readRow = communication.read_status?.[0];
    return NextResponse.json({
      communication: {
        ...communication,
        last_read_at: readRow?.last_read_at || null,
        unread_count: Math.max((messages?.length || 0) - (readRow?.last_message_count || 0), 0)
      },
      messages: messages || []
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch communication' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { projectId, commId } = params;
  const validationError = validateParams(projectId, commId);
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase } = authContext;

  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      status,
      priority,
      dueDate,
      attachments,
      assignedTo,
      metadata
    } = body || {};

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (attachments !== undefined) updateData.attachments = attachments;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aloa_communications')
      .update(updateData)
      .eq('project_id', projectId)
      .eq('id', commId)
      .select()
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to update communication');
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ communication: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update communication' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { projectId, commId } = params;
  const validationError = validateParams(projectId, commId);
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase, role } = authContext;
  const isAdmin = ADMIN_ROLES.includes(role);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: current, error: fetchError } = await supabase
      .from('aloa_communications')
      .select('metadata')
      .eq('project_id', projectId)
      .eq('id', commId)
      .maybeSingle();

    if (fetchError) {
      return handleSupabaseError(fetchError, 'Failed to delete communication');
    }

    if (!current) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const metadata = current.metadata || {};
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('aloa_communications')
      .update({
        metadata: {
          ...metadata,
          deleted: true,
          deleted_at: now,
          deleted_by: authContext.user.id
        }
      })
      .eq('project_id', projectId)
      .eq('id', commId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete communication');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete communication' }, { status: 500 });
  }
}
