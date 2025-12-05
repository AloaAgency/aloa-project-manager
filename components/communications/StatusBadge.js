import { getStatusStyle } from '@/lib/communicationHelpers';

export default function StatusBadge({ status }) {
  const { label, color } = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${color}`}>
      {label}
    </span>
  );
}
