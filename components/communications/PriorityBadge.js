import { getPriorityStyle } from '@/lib/communicationHelpers';

export default function PriorityBadge({ priority }) {
  const { label, color } = getPriorityStyle(priority);
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${color}`}>
      {label}
    </span>
  );
}
