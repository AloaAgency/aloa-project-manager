import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/communicationHelpers';

const ADMIN_REQUEST_CATEGORIES = [
  { value: 'review_request', label: 'Review Request' },
  { value: 'approval_request', label: 'Approval Required' },
  { value: 'feedback_request', label: 'Feedback Request' },
  { value: 'document_request', label: 'Document Request' },
  { value: 'decision_request', label: 'Decision Required' },
  { value: 'action_required', label: 'Action Required' }
];

export default function CreateAdminRequestForm({ projectId, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('review_request');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [clients, setClients] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [role, setRole] = useState(null);

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const res = await apiFetch(`/api/aloa-projects/${projectId}/team`);
        const clientMembers = (res?.team || []).filter((member) =>
          ['client', 'client_admin', 'client_participant'].includes(member.system_role)
        );
        setClients(clientMembers);
      } catch (err) {
        // silent; leave list empty
      } finally {
        setLoadingClients(false);
      }
    };
    const loadRole = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        setRole(res?.role || null);
      } catch (err) {
        // ignore
      }
    };
    if (projectId) {
      loadClients();
      loadTemplates();
      loadRole();
    }
  }, [projectId]);

  const loadTemplates = async () => {
    try {
      const res = await apiFetch(`/api/aloa-projects/${projectId}/communications/templates`);
      setTemplates(res?.templates || []);
    } catch (err) {
      // ignore
    }
  };

  const availableTemplates = useMemo(() => {
    if (!templates) return [];
    if (role && ['client', 'client_admin', 'client_participant'].includes(role)) {
      return [];
    }
    return templates;
  }, [templates, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = `/api/aloa-projects/${projectId}/communications`;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        direction: 'admin_to_client',
        priority,
        dueDate: dueDate || null,
        assignedTo: assignees
      };
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignees([]);
      setSelectedTemplate('');
      if (onCreated) {
        onCreated(res?.communication);
      }
    } catch (err) {
      setError(err.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Create client request</h2>
      {error && <div className="mt-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Template</label>
            <select
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={selectedTemplate}
              onChange={(e) => {
                const templateId = e.target.value;
                setSelectedTemplate(templateId);
                if (!templateId) return;
                const tmpl = availableTemplates.find((t) => t.id === templateId);
                if (tmpl) {
                  if (tmpl.default_title) setTitle(tmpl.default_title);
                  if (tmpl.default_description) setDescription(tmpl.default_description);
                  if (tmpl.default_priority) setPriority(tmpl.default_priority);
                  if (tmpl.category) setCategory(tmpl.category);
                }
              }}
              disabled={submitting}
            >
              <option value="">None</option>
              {availableTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {ADMIN_REQUEST_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review final logo options"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide context for the request"
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Priority</label>
            <select
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Due date</label>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Assign to clients (optional)</label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {loadingClients && <div className="text-sm text-slate-500">Loading clients...</div>}
            {!loadingClients && clients.length === 0 && (
              <div className="text-sm text-slate-500">No client members found.</div>
            )}
            {clients.map((client) => (
              <label key={client.user_id} className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  checked={assignees.includes(client.user_id)}
                  onChange={(e) => {
                    setAssignees((prev) =>
                      e.target.checked
                        ? [...prev, client.user_id]
                        : prev.filter((id) => id !== client.user_id)
                    );
                  }}
                  disabled={submitting}
                />
                <span>{client.name || client.email}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Creating...' : 'Create request'}
        </button>
      </div>
    </form>
  );
}
