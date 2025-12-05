import { NextResponse } from 'next/server';
import {
  ADMIN_ROLES,
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';
import { notifyCommunicationMessage } from '@/lib/communicationNotifications';
import { extractCommunicationKnowledge } from '@/lib/knowledge/communicationsExtractor';

function validateParams(projectId, commId) {
  return validateUuid(projectId, 'projectId') || validateUuid(commId, 'communicationId');
}

async function ensureCommunicationAccess(supabase, projectId, commId) {
  const { data, error } = await supabase
    .from('aloa_communications')
    .select('id')
    .eq('project_id', projectId)
    .eq('id', commId)
    .maybeSingle();

  if (error) {
    return { error };
  }

  if (!data) {
    return { notFound: true };
  }

  return {};
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

  const { supabase } = authContext;

  const access = await ensureCommunicationAccess(supabase, projectId, commId);
  if (access.error) {
    return handleSupabaseError(access.error, 'Failed to verify communication');
  }
  if (access.notFound) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { data, error } = await supabase
      .from('aloa_communication_messages')
      .select('*')
      .eq('communication_id', commId)
      .order('created_at', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch messages');
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
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

  const { supabase, user, role } = authContext;
  const isAdmin = ADMIN_ROLES.includes(role) || role === 'team_member';

  const access = await ensureCommunicationAccess(supabase, projectId, commId);
  if (access.error) {
    return handleSupabaseError(access.error, 'Failed to verify communication');
  }
  if (access.notFound) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { data: communication } = await supabase
      .from('aloa_communications')
      .select('*')
      .eq('id', commId)
      .maybeSingle();

    const body = await request.json();
    const { message, attachments = [], messageType = 'comment' } = body || {};

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aloa_communication_messages')
      .insert({
        communication_id: commId,
        user_id: user.id,
        is_admin: isAdmin,
        message,
        attachments,
        message_type: messageType
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to add message');
    }

    // Fire-and-forget notifications
    notifyCommunicationMessage({
      projectId,
      communication: communication || { id: commId, title: message, assigned_to: [], direction: '' },
      authorIsAdmin: isAdmin,
      authorId: user.id
    });

    // Knowledge extraction only for client messages
    if (!isAdmin && communication) {
      extractCommunicationKnowledge(communication, [data]);
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}
