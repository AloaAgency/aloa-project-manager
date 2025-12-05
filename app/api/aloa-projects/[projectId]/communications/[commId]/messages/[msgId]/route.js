import { NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';

function validateParams(projectId, commId, msgId) {
  return (
    validateUuid(projectId, 'projectId') ||
    validateUuid(commId, 'communicationId') ||
    validateUuid(msgId, 'messageId')
  );
}

export async function PATCH(request, { params }) {
  const { projectId, commId, msgId } = params;
  const validationError = validateParams(projectId, commId, msgId);
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
    const { data: messageRecord, error: fetchError } = await supabase
      .from('aloa_communication_messages')
      .select('id, user_id, created_at, communication_id')
      .eq('id', msgId)
      .eq('communication_id', commId)
      .single();

    if (fetchError) {
      return handleSupabaseError(fetchError, 'Failed to fetch message');
    }

    if (!messageRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Optional: enforce edit window of 15 minutes for non-admin authors
    if (!isAdmin) {
      const createdAt = new Date(messageRecord.created_at);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (createdAt < fifteenMinutesAgo) {
        return NextResponse.json({ error: 'Edit window expired' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { message, attachments } = body || {};

    const updateData = {};
    if (message !== undefined) updateData.message = message;
    if (attachments !== undefined) updateData.attachments = attachments;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aloa_communication_messages')
      .update(updateData)
      .eq('id', msgId)
      .eq('communication_id', commId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update message');
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
