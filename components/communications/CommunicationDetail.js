import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function CommunicationDetail({ communication }) {
  if (!communication) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={communication.status} />
          <PriorityBadge priority={communication.priority} />
        </div>
        <div className="text-xs text-slate-500">
          Created {new Date(communication.created_at).toLocaleString()}
        </div>
      </div>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">{communication.title}</h1>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{communication.description}</p>
      <div className="mt-3 text-sm text-slate-500">
        {communication.due_date ? `Due ${new Date(communication.due_date).toLocaleDateString()}` : 'No due date'}
      </div>
    </div>
  );
}
