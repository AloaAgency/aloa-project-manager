import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAdminServiceRole,
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
    if (!isAdmin) {
      const hasAccess = await hasProjectAccess(serviceSupabase, params.projectId, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: interactions, error } = await serviceSupabase
      .from('aloa_applet_interactions')
      .select(
        `
          *,
          applet:aloa_applets(
            id,
            name,
            type,
            requires_approval,
            projectlet:aloa_projectlets(
              id,
              name
            )
          )
        `
      )
      .eq('project_id', params.projectId)
      .eq('user_role', 'client')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch notifications');
    }

    const notifications = (interactions || []).map((interaction) => {
      let title;
      let message;
      let type;

      switch (interaction.interaction_type) {
        case 'form_submit':
          title = 'Form Submitted';
          message = `Client submitted "${interaction.applet?.name}" in ${interaction.applet?.projectlet?.name}`;
          type = 'form_submitted';
          break;
        case 'form_save':
          title = 'Form Progress Saved';
          message = `Client saved progress on "${interaction.applet?.name}"`;
          type = 'form_progress';
          break;
        case 'view':
          title = 'Task Viewed';
          message = `Client viewed "${interaction.applet?.name}" in ${interaction.applet?.projectlet?.name}`;
          type = 'applet_viewed';
          break;
        case 'acknowledge':
          title = 'Task Acknowledged';
          message = `Client acknowledged "${interaction.applet?.name}"`;
          type = 'applet_acknowledged';
          break;
        case 'link_submit':
          title = 'Link Submitted';
          message = `Client submitted links for "${interaction.applet?.name}"`;
          type = 'link_submitted';
          break;
        case 'file_upload':
          title = 'File Uploaded';
          message = `Client uploaded files for "${interaction.applet?.name}"`;
          type = 'file_uploaded';
          break;
        case 'submission':
          title = 'Task Completed';
          message = `Client completed "${interaction.applet?.name}" in ${interaction.applet?.projectlet?.name}`;
          type = 'applet_completed';
          break;
        case 'approval_request':
          title = 'Approval Needed';
          message = `"${interaction.applet?.name}" requires your approval`;
          type = 'needs_approval';
          break;
        case 'start':
          title = 'Task Started';
          message = `Client started working on "${interaction.applet?.name}"`;
          type = 'applet_started';
          break;
        default:
          title = 'Client Activity';
          message = `Client activity on "${interaction.applet?.name}" (${interaction.interaction_type})`;
          type = 'general';
      }

      return {
        id: interaction.id,
        title,
        message,
        type,
        interaction_type: interaction.interaction_type,
        created_at: interaction.created_at,
        read: interaction.read || false,
        applet_id: interaction.applet_id,
        data: interaction.data,
      };
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { appletId, type, title, message, data } = await request.json();

    const appletValidation = validateUuid(appletId, 'applet ID');
    if (appletValidation) {
      return appletValidation;
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Notification type is required' }, { status: 400 });
    }

    const { data: interaction, error } = await serviceSupabase
      .from('aloa_applet_interactions')
      .insert([
        {
          applet_id: appletId,
          project_id: params.projectId,
          interaction_type: type,
          user_role: 'system',
          data: {
            notification_title: title,
            notification_message: message,
            ...data,
          },
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to create notification');
    }

    return NextResponse.json({ success: true, notification: interaction });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
