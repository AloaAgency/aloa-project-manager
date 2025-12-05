import { useState } from 'react';
import { apiFetch } from '@/lib/communicationHelpers';

const CLIENT_REQUEST_CATEGORIES = [
  { value: 'change_request', label: 'Change Request' },
  { value: 'issue_report', label: 'Issue Report' },
  { value: 'question', label: 'Question' },
  { value: 'new_requirement', label: 'New Requirement' },
  { value: 'status_inquiry', label: 'Status Inquiry' },
  { value: 'general', label: 'General' }
];

export default function CreateRequestForm({ projectId, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('change_request');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
        direction: 'client_to_admin',
        priority
      };
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setTitle('');
      setDescription('');
      if (onCreated) {
        onCreated(res?.communication);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Submit a request</h2>
      {error && <div className="mt-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <div className="mt-3 space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your request"
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
            placeholder="Provide details about your request"
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {CLIENT_REQUEST_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
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
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Submitting...' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
