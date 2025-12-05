export default function CommunicationThread({ messages }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-slate-500">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{msg.is_admin ? 'Agency' : 'Client'}</span>
            <span>{new Date(msg.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{msg.message}</p>
        </div>
      ))}
    </div>
  );
}
