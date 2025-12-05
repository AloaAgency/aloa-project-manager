import Link from 'next/link';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { truncate } from '@/lib/communicationHelpers';

export default function CommunicationCard({ projectId, communication }) {
  const {
    id,
    title,
    description,
    status,
    priority,
    due_date: dueDate,
    unread_count: unreadCount,
    direction
  } = communication;

  return (
    <Link
      href={`/project/${projectId}/communications/${id}`}
      className="block rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <PriorityBadge priority={priority} />
          <span className="text-xs font-medium text-slate-500">{direction === 'admin_to_client' ? 'From Agency' : 'My Request'}</span>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
            {unreadCount} unread
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{truncate(description, 180)}</p>
        <div className="mt-2 text-xs text-slate-500">
          {dueDate ? `Due ${new Date(dueDate).toLocaleDateString()}` : 'No due date'}
        </div>
      </div>
    </Link>
  );
}
