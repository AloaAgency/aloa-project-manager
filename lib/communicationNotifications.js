import { createServiceClient } from '@/lib/supabase-service';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function getProjectUserIdsByRoles(projectId, roles) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('aloa_project_members')
    .select(`
      user_id,
      user:aloa_user_profiles(role)
    `)
    .eq('project_id', projectId);

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((row) => row.user && roles.includes(row.user.role))
    .map((row) => row.user_id);
}

async function insertNotifications(notifications) {
  if (!notifications.length) return;
  const supabase = createServiceClient();
  await supabase.from('aloa_client_notifications').insert(notifications);
}

async function sendEmailNotifications(recipients, subject, html) {
  if (!resend || !recipients.length) return;
  try {
    await resend.emails.send({
      from: 'Aloa Updates <updates@aloa.agency>',
      to: recipients,
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send communication emails', error);
  }
}

export async function notifyCommunicationCreated({ projectId, communication, creator }) {
  try {
    const notifications = [];
    let targetIds = [];
    if (communication.direction === 'admin_to_client') {
      targetIds = communication.assigned_to?.length
        ? communication.assigned_to
        : await getProjectUserIdsByRoles(projectId, ['client', 'client_admin', 'client_participant']);
      targetIds
        .filter((id) => id !== creator)
        .forEach((userId) => {
          notifications.push({
            project_id: projectId,
            user_id: userId,
            type: 'communication_created',
            title: communication.title,
            message: communication.description || 'New request from your agency',
            data: { communicationId: communication.id, direction: communication.direction }
          });
        });
    } else {
      targetIds = await getProjectUserIdsByRoles(projectId, ['super_admin', 'project_admin', 'team_member']);
      targetIds
        .filter((id) => id !== creator)
        .forEach((userId) => {
          notifications.push({
            project_id: projectId,
            user_id: userId,
            type: 'client_request',
            title: communication.title,
            message: communication.description || 'New client request',
            data: { communicationId: communication.id, direction: communication.direction, createdBy: creator }
          });
        });
    }

    await insertNotifications(notifications);

    // Optional email
    const emailRecipients = targetIds.slice(0, 5); // cap to prevent blast
    const subject = communication.direction === 'admin_to_client'
      ? `New Request: ${communication.title}`
      : `Client Request: ${communication.title}`;
    const html = `<p>${communication.description || 'You have a new communication item.'}</p><p>View it in the project portal.</p>`;
    sendEmailNotifications(emailRecipients, subject, html);
  } catch (error) {
    console.error('notifyCommunicationCreated error', error);
  }
}

export async function notifyCommunicationMessage({ projectId, communication, authorIsAdmin, authorId }) {
  try {
    const notifications = [];
    let targetIds = [];
    if (authorIsAdmin) {
      targetIds = communication.assigned_to?.length
        ? communication.assigned_to
        : await getProjectUserIdsByRoles(projectId, ['client', 'client_admin', 'client_participant']);
      targetIds
        .filter((id) => id !== authorId)
        .forEach((userId) => {
          notifications.push({
            project_id: projectId,
            user_id: userId,
            type: 'communication_reply',
            title: communication.title,
            message: 'New reply from your agency',
            data: { communicationId: communication.id }
          });
        });
    } else {
      targetIds = await getProjectUserIdsByRoles(projectId, ['super_admin', 'project_admin', 'team_member']);
      targetIds
        .filter((id) => id !== authorId)
        .forEach((userId) => {
          notifications.push({
            project_id: projectId,
            user_id: userId,
            type: 'communication_reply',
            title: communication.title,
            message: 'New reply from client',
            data: { communicationId: communication.id }
          });
        });
    }

    await insertNotifications(notifications);

    const emailRecipients = targetIds.slice(0, 5);
    const subject = authorIsAdmin
      ? `Reply from your agency: ${communication.title}`
      : `Client replied: ${communication.title}`;
    const html = `<p>${authorIsAdmin ? 'Agency' : 'Client'} replied on "${communication.title}".</p><p>View it in the project portal.</p>`;
    sendEmailNotifications(emailRecipients, subject, html);
  } catch (error) {
    console.error('notifyCommunicationMessage error', error);
  }
}
