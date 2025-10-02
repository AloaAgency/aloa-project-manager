/**
 * Client Notification Utilities
 * Helper functions for sending notifications to client users
 */

import { createServiceClient } from '@/lib/supabase-service';

/**
 * Send a notification to all client users in a project
 * @param {string} projectId - The project ID
 * @param {string} type - Notification type (new_task, task_unlocked, etc.)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} options - Additional options
 * @returns {Promise<object>} Result of the notification creation
 */
export async function notifyProjectClients(projectId, type, title, message, options = {}) {
  const serviceSupabase = createServiceClient();

  try {
    // Get all client users in the project
    const { data: projectMembers, error: membersError } = await serviceSupabase
      .from('aloa_project_members')
      .select(`
        user_id,
        user:aloa_user_profiles(
          user_id,
          role,
          email,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .in('user.role', ['client', 'client_admin', 'client_participant']);

    if (membersError) {
      console.error('Error fetching project members:', membersError);
      return { success: false, error: membersError };
    }

    const notifications = [];

    // Create notifications for each client user
    for (const member of projectMembers || []) {
      if (member.user) {
        const notification = {
          project_id: projectId,
          user_id: member.user_id,
          type,
          title,
          message,
          applet_id: options.appletId || null,
          projectlet_id: options.projectletId || null,
          data: options.data || {},
        };

        notifications.push(notification);
      }
    }

    if (notifications.length === 0) {
      return { success: true, message: 'No client users to notify' };
    }

    // Insert all notifications
    const { data, error } = await serviceSupabase
      .from('aloa_client_notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      return { success: false, error };
    }

    return {
      success: true,
      notifications: data,
      count: data.length,
      message: `Notified ${data.length} client user(s)`
    };
  } catch (error) {
    console.error('Error in notifyProjectClients:', error);
    return { success: false, error };
  }
}

/**
 * Send a notification to a specific user
 * @param {string} projectId - The project ID
 * @param {string} userId - The user ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} options - Additional options
 * @returns {Promise<object>} Result of the notification creation
 */
export async function notifyUser(projectId, userId, type, title, message, options = {}) {
  const serviceSupabase = createServiceClient();

  try {
    const { data, error } = await serviceSupabase
      .from('aloa_client_notifications')
      .insert([{
        project_id: projectId,
        user_id: userId,
        type,
        title,
        message,
        applet_id: options.appletId || null,
        projectlet_id: options.projectletId || null,
        data: options.data || {},
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true, notification: data };
  } catch (error) {
    console.error('Error in notifyUser:', error);
    return { success: false, error };
  }
}

/**
 * Notification templates for common scenarios
 */
export const NotificationTemplates = {
  taskUnlocked: (appletName, projectletName) => ({
    type: 'task_unlocked',
    title: 'Task Ready for You!',
    message: `"${appletName}" in ${projectletName} is now available for your input`
  }),

  newTask: (appletName, projectletName) => ({
    type: 'new_task',
    title: 'New Task Assigned',
    message: `Please complete "${appletName}" in ${projectletName}`
  }),

  approvalReceived: (appletName) => ({
    type: 'approval_received',
    title: 'Work Approved! ✅',
    message: `Your submission for "${appletName}" has been approved`
  }),

  revisionRequested: (appletName, reason) => ({
    type: 'revision_requested',
    title: 'Revision Requested',
    message: reason ?
      `Changes requested for "${appletName}": ${reason}` :
      `Please review and update "${appletName}" based on feedback`
  }),

  deadlineReminder: (appletName, daysLeft) => ({
    type: 'deadline_reminder',
    title: `Deadline Approaching (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`,
    message: `Please complete "${appletName}" soon`
  }),

  milestoneComplete: (milestoneName) => ({
    type: 'milestone_complete',
    title: 'Milestone Complete! 🎉',
    message: `Congratulations! You've completed the ${milestoneName} phase`
  }),

  generalMessage: (title, message) => ({
    type: 'message',
    title,
    message
  })
};

/**
 * Helper to send notification when applet is unlocked
 */
export async function notifyAppletUnlocked(applet, projectId) {
  if (!applet || !projectId) return { success: false, error: 'Missing required parameters' };

  // Get projectlet info
  const serviceSupabase = createServiceClient();
  const { data: projectletData } = await serviceSupabase
    .from('aloa_projectlets')
    .select('name')
    .eq('id', applet.projectlet_id)
    .single();

  const projectletName = projectletData?.name || 'current phase';
  const template = NotificationTemplates.taskUnlocked(applet.name, projectletName);

  return notifyProjectClients(
    projectId,
    template.type,
    template.title,
    template.message,
    {
      appletId: applet.id,
      projectletId: applet.projectlet_id,
      data: { auto_generated: true }
    }
  );
}

/**
 * Helper to send notification when new applet is created
 */
export async function notifyNewApplet(applet, projectId) {
  if (!applet || !projectId) return { success: false, error: 'Missing required parameters' };

  // Get projectlet info
  const serviceSupabase = createServiceClient();
  const { data: projectletData } = await serviceSupabase
    .from('aloa_projectlets')
    .select('name')
    .eq('id', applet.projectlet_id)
    .single();

  const projectletName = projectletData?.name || 'current phase';
  const template = NotificationTemplates.newTask(applet.name, projectletName);

  return notifyProjectClients(
    projectId,
    template.type,
    template.title,
    template.message,
    {
      appletId: applet.id,
      projectletId: applet.projectlet_id,
      data: { auto_generated: true }
    }
  );
}