import { createServiceClient } from '@/lib/supabase-service';

const CATEGORY_MAP = {
  review_request: 'requirements',
  approval_request: 'decision',
  feedback_request: 'feedback',
  document_request: 'assets',
  decision_request: 'decision',
  action_required: 'tasks',
  change_request: 'change',
  issue_report: 'issue',
  question: 'question',
  new_requirement: 'requirements',
  status_inquiry: 'status',
  general: 'general'
};

function priorityToScore(priority) {
  switch (priority) {
    case 'urgent': return 10;
    case 'high': return 8;
    case 'medium': return 5;
    case 'low': return 3;
    default: return 5;
  }
}

function summarizeClientInput(content) {
  if (!content) return '';
  const base = content.request_title || content.client_messages?.[0] || content.client_responses?.[0]?.message || '';
  return typeof base === 'string' ? base.slice(0, 180) : '';
}

export async function extractCommunicationKnowledge(communication, messages = []) {
  if (!communication) return;

  const serviceSupabase = createServiceClient();

  // Only client-authored content should be ingested
  const clientMessages = (messages || []).filter((m) => !m.is_admin);

  if (clientMessages.length === 0 && communication.direction !== 'client_to_admin') {
    return;
  }

  const clientContent = communication.direction === 'client_to_admin'
    ? {
        request_title: communication.title,
        request_description: communication.description,
        request_category: communication.category,
        client_messages: clientMessages.map((m) => m.message),
        attachments: communication.attachments
      }
    : {
        client_responses: clientMessages.map((m) => ({
          message: m.message,
          attachments: m.attachments,
          timestamp: m.created_at
        }))
      };

  const knowledgeItem = {
    project_id: communication.project_id,
    source_type: 'communication',
    source_id: communication.id,
    source_name: `Client Response: ${communication.title}`,
    content_type: 'requirements',
    category: CATEGORY_MAP[communication.category] || 'general',
    content: JSON.stringify(clientContent),
    content_summary: summarizeClientInput(clientContent),
    tags: [communication.category, 'client_response'],
    importance_score: priorityToScore(communication.priority),
    processed_at: new Date().toISOString()
  };

  try {
    await serviceSupabase.from('aloa_project_knowledge').insert(knowledgeItem);
  } catch (error) {
    console.error('extractCommunicationKnowledge error', error);
  }
}
