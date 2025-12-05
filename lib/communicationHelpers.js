export const STATUS_STYLES = {
  open: { label: 'Open', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  acknowledged: { label: 'Acknowledged', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_review: { label: 'Pending Review', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined: { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  on_hold: { label: 'On Hold', color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

export const PRIORITY_STYLES = {
  low: { label: 'Low', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  medium: { label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || { label: status || 'Unknown', color: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export function getPriorityStyle(priority) {
  return PRIORITY_STYLES[priority] || { label: priority || 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' };
}

export function truncate(text, length = 140) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  });

  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const data = await res.json();
      errorMessage = data?.error || errorMessage;
    } catch (err) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  try {
    return await res.json();
  } catch (err) {
    return null;
  }
}
