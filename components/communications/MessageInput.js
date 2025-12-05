import { useState } from 'react';

export default function MessageInput({ onSend, loading }) {
  const [message, setMessage] = useState('');
  const [attachments] = useState([]);

  const handleSend = async () => {
    if (!message.trim()) return;
    await onSend({ message: message.trim(), attachments });
    setMessage('');
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <textarea
        className="w-full resize-none rounded border border-slate-200 p-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        rows={3}
        placeholder="Add a comment..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={loading}
      />
      <div className="mt-2 flex items-center justify-end">
        <button
          onClick={handleSend}
          disabled={loading || !message.trim()}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
