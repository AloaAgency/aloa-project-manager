import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';

function validateParams(projectId, commId) {
  return validateUuid(projectId, 'projectId') || validateUuid(commId, 'communicationId');
}

export async function POST(request, { params }) {
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
    // Ensure communication belongs to project and user can see it
    const { data: comm, error: commError } = await supabase
      .from('aloa_communications')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('id', commId)
      .maybeSingle();

    if (commError) {
      return handleSupabaseError(commError, 'Failed to fetch communication');
    }

    if (!comm) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { count: messageCount, error: countError } = await supabase
      .from('aloa_communication_messages')
      .select('id', { count: 'exact', head: true })
      .eq('communication_id', commId);

    if (countError) {
      return handleSupabaseError(countError, 'Failed to count messages');
    }

    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from('aloa_communication_read_status')
      .upsert({
        communication_id: commId,
        user_id: user.id,
        last_read_at: now,
        last_message_count: messageCount || 0
      }, { onConflict: 'communication_id,user_id' });

    if (upsertError) {
      return handleSupabaseError(upsertError, 'Failed to mark as read');
    }

    if (comm.status === 'open') {
      await supabase
        .from('aloa_communications')
        .update({ status: 'acknowledged' })
        .eq('id', commId)
        .eq('status', 'open');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
