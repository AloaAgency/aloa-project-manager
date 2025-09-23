import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET notifications for a project
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Get recent applet interactions from clients (exclude system role)
    const { data: interactions, error } = await supabase
      .from('aloa_applet_interactions')
      .select(`
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
      `)
      .eq('project_id', projectId)
      .eq('user_role', 'client')  // Only show client interactions
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Transform interactions into notifications
    const notifications = interactions?.map(interaction => {
      let title, message, type;

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
        data: interaction.data
      };
    }) || [];

    return NextResponse.json({ notifications });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new notification (called when client completes something)
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { appletId, type, title, message, data } = await request.json();

    // Create an interaction record that will serve as a notification
    const { data: interaction, error } = await supabase
      .from('aloa_applet_interactions')
      .insert([{
        applet_id: appletId,
        project_id: projectId,
        interaction_type: type,
        user_role: 'system',
        data: {
          notification_title: title,
          notification_message: message,
          ...data
        }
      }])
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification: interaction });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}