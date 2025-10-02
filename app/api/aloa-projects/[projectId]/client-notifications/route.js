import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAuthenticatedSupabase,
  validateUuid,
} from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin } = authContext;
  const serviceSupabase = createServiceClient();

  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

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

    const targetHasAccess = await hasProjectAccess(serviceSupabase, params.projectId, targetUserId);
    if (!targetHasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch client notifications - these are system-generated notifications for the client
    const { data: notifications, error } = await serviceSupabase
      .from('aloa_client_notifications')
      .select('*')
      .eq('project_id', params.projectId)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error && error.code !== 'PGRST116') { // Ignore table doesn't exist error for now
      return handleSupabaseError(error, 'Failed to fetch notifications');
    }

    // If table doesn't exist yet, return empty array
    if (error?.code === 'PGRST116' || !notifications) {
      // For now, create some mock notifications based on recent applet activity
      const { data: recentActivity } = await serviceSupabase
        .from('aloa_applet_interactions')
        .select(`
          *,
          applet:aloa_applets(
            id,
            name,
            type,
            config,
            projectlet:aloa_projectlets(
              id,
              name
            )
          )
        `)
        .eq('project_id', params.projectId)
        .eq('user_role', 'agency')
        .in('interaction_type', ['unlock', 'assign', 'update'])
        .order('created_at', { ascending: false })
        .limit(10);

      const mockNotifications = [];

      if (recentActivity) {
        recentActivity.forEach((activity) => {
          let notification = null;

          if (activity.interaction_type === 'unlock') {
            notification = {
              id: activity.id,
              project_id: params.projectId,
              user_id: targetUserId,
              type: 'task_unlocked',
              title: 'Task Ready for You!',
              message: `"${activity.applet?.name}" in ${activity.applet?.projectlet?.name} is now available`,
              created_at: activity.created_at,
              read: false,
              applet_id: activity.applet_id,
              data: { interaction_id: activity.id }
            };
          } else if (activity.interaction_type === 'assign') {
            notification = {
              id: activity.id,
              project_id: params.projectId,
              user_id: targetUserId,
              type: 'new_task',
              title: 'New Task Assigned',
              message: `Please complete "${activity.applet?.name}" in ${activity.applet?.projectlet?.name}`,
              created_at: activity.created_at,
              read: false,
              applet_id: activity.applet_id,
              data: { interaction_id: activity.id }
            };
          }

          if (notification) {
            mockNotifications.push(notification);
          }
        });
      }

      // Add a welcome notification if this is their first visit
      if (mockNotifications.length === 0) {
        mockNotifications.push({
          id: 'welcome',
          project_id: params.projectId,
          user_id: targetUserId,
          type: 'message',
          title: 'Welcome to Your Project!',
          message: 'Your team will notify you here when new tasks are ready for your input.',
          created_at: new Date().toISOString(),
          read: false,
          data: {}
        });
      }

      return NextResponse.json({ notifications: mockNotifications });
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Error fetching client notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new notification for the client
export async function POST(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin } = authContext;
  const serviceSupabase = createServiceClient();

  try {
    // Only admins can create notifications for clients
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, type, title, message, appletId, projectletId, data } = await request.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    const userIdValidation = validateUuid(userId, 'user ID');
    if (userIdValidation) {
      return userIdValidation;
    }

    const userHasAccess = await hasProjectAccess(serviceSupabase, params.projectId, userId);
    if (!userHasAccess) {
      return NextResponse.json({ error: 'Target user is not part of this project' }, { status: 400 });
    }

    // Check if the table exists, if not create it
    const { error: tableCheckError } = await serviceSupabase
      .from('aloa_client_notifications')
      .select('id')
      .limit(1);

    if (tableCheckError?.code === 'PGRST116') {
      // Table doesn't exist, create it
      const { error: createTableError } = await serviceSupabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS aloa_client_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            applet_id UUID REFERENCES aloa_applets(id) ON DELETE SET NULL,
            projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
            read BOOLEAN DEFAULT false,
            data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT aloa_client_notifications_type_check CHECK (type IN (
              'new_task',
              'task_unlocked',
              'approval_received',
              'revision_requested',
              'deadline_reminder',
              'message',
              'milestone_complete',
              'general'
            ))
          );

          CREATE INDEX IF NOT EXISTS idx_client_notifications_project_user
            ON aloa_client_notifications(project_id, user_id);
          CREATE INDEX IF NOT EXISTS idx_client_notifications_created
            ON aloa_client_notifications(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_client_notifications_read
            ON aloa_client_notifications(read);
          CREATE INDEX IF NOT EXISTS idx_client_notifications_type
            ON aloa_client_notifications(type);
          CREATE INDEX IF NOT EXISTS idx_client_notifications_applet
            ON aloa_client_notifications(applet_id) WHERE applet_id IS NOT NULL;

          ALTER TABLE aloa_client_notifications ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Users can read own notifications"
            ON aloa_client_notifications FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());

          CREATE POLICY "Admins can create notifications"
            ON aloa_client_notifications FOR INSERT
            TO authenticated
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM aloa_user_profiles
                WHERE id = auth.uid()
                AND role IN ('super_admin', 'project_admin', 'team_member')
              )
            );

          CREATE POLICY "Users can update own notifications"
            ON aloa_client_notifications FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());

          CREATE POLICY "Users can delete own notifications"
            ON aloa_client_notifications FOR DELETE
            TO authenticated
            USING (user_id = auth.uid());

          CREATE POLICY "Admins can manage project notifications"
            ON aloa_client_notifications FOR ALL
            TO authenticated
            USING (
              EXISTS (
                SELECT 1
                FROM aloa_user_profiles up
                WHERE up.id = auth.uid()
                AND up.role IN ('super_admin', 'project_admin', 'team_member')
              )
              AND EXISTS (
                SELECT 1
                FROM aloa_project_members pm
                WHERE pm.project_id = aloa_client_notifications.project_id
                  AND pm.user_id = auth.uid()
              )
            );
        `
      });

      if (createTableError) {
        console.error('Failed to create notifications table:', createTableError);
      }
    }

    // Insert the notification
    const { data: notification, error } = await serviceSupabase
      .from('aloa_client_notifications')
      .insert([
        {
          project_id: params.projectId,
          user_id: userId,
          type,
          title,
          message,
          applet_id: appletId || null,
          projectlet_id: projectletId || null,
          data: data || {},
        },
      ])
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to create notification');
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
