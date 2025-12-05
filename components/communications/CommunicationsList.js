import CommunicationCard from './CommunicationCard';

export default function CommunicationsList({ projectId, communications }) {
  if (!communications || communications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500">
        No communications yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {communications.map((comm) => (
        <CommunicationCard key={comm.id} projectId={projectId} communication={comm} />
      ))}
    </div>
  );
}
