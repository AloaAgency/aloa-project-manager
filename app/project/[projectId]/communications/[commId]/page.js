'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CommunicationDetail from '@/components/communications/CommunicationDetail';
import CommunicationThread from '@/components/communications/CommunicationThread';
import MessageInput from '@/components/communications/MessageInput';
import { apiFetch } from '@/lib/communicationHelpers';

export default function CommunicationDetailPage() {
  const { projectId, commId } = useParams();
  const router = useRouter();
  const [communication, setCommunication] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const loadCommunication = useCallback(async () => {
    if (!projectId || !commId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/aloa-projects/${projectId}/communications/${commId}`);
      setCommunication(res?.communication || null);
      setMessages(res?.messages || []);
      // mark as read
      await apiFetch(`/api/aloa-projects/${projectId}/communications/${commId}/mark-read`, { method: 'POST' });
    } catch (err) {
      setError(err.message || 'Failed to load communication');
    } finally {
      setLoading(false);
    }
  }, [projectId, commId]);

  useEffect(() => {
    loadCommunication();
  }, [loadCommunication]);

  const handleSend = async ({ message, attachments }) => {
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/aloa-projects/${projectId}/communications/${commId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, attachments })
      });
      await loadCommunication();
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 text-slate-600">
        Loading communication...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      </div>
    );
  }

  if (!communication) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 text-slate-600">
        Communication not found.
        <button
          onClick={() => router.back()}
          className="ml-2 text-sm font-semibold text-slate-900 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <button
        onClick={() => router.back()}
        className="w-fit text-sm font-semibold text-slate-900 underline"
      >
        ← Back to communications
      </button>
      <CommunicationDetail communication={communication} />
      <CommunicationThread messages={messages} />
      <MessageInput onSend={handleSend} loading={sending} />
    </div>
  );
}
