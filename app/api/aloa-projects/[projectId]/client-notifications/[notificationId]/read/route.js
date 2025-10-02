import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAuthenticatedSupabase,
  validateUuid,
} from '@/app/api/_utils/admin';

export async function POST(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const notificationValidation = validateUuid(params.notificationId, 'notification ID');
  if (notificationValidation) {
    return notificationValidation;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin } = authContext;
  const serviceSupabase = createServiceClient();

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const requestedUserId = body.userId;

    let targetUserId = user.id;
    if (requestedUserId) {
      const userValidation = validateUuid(requestedUserId, 'user ID');
      if (userValidation) {
        return userValidation;
      }

      if (!isAdmin && requestedUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      targetUserId = requestedUserId;
    }

    if (!isAdmin) {
      const callerHasAccess = await hasProjectAccess(serviceSupabase, params.projectId, user.id);
      if (!callerHasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Check if table exists
    const { error: tableCheckError } = await serviceSupabase
      .from('aloa_client_notifications')
      .select('id')
      .limit(1);

    if (tableCheckError?.code === 'PGRST116') {
      // Table doesn't exist yet, just return success
      return NextResponse.json({ success: true });
    }

    // Mark notification as read
    const targetHasAccess = await hasProjectAccess(serviceSupabase, params.projectId, targetUserId);
    if (!targetHasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await serviceSupabase
      .from('aloa_client_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', params.notificationId)
      .eq('user_id', targetUserId)
      .eq('project_id', params.projectId);

    if (error) {
      return handleSupabaseError(error, 'Failed to mark notification as read');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
