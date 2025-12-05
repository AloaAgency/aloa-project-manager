'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import CommunicationsList from '@/components/communications/CommunicationsList';
import CreateAdminRequestForm from '@/components/communications/CreateAdminRequestForm';
import { apiFetch } from '@/lib/communicationHelpers';

export default function AdminCommunicationsPage() {
  const { projectId } = useParams();
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ statusCounts: {}, overdue: 0, unread: 0 });

  const loadCommunications = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/aloa-projects/${projectId}/communications`);
      setCommunications(res?.communications || []);
    } catch (err) {
      setError(err.message || 'Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiFetch(`/api/aloa-projects/${projectId}/communications/stats`);
      setStats({
        statusCounts: res?.statusCounts || {},
        overdue: res?.overdue || 0,
        unread: res?.unread || 0
      });
    } catch (err) {
      // ignore stats errors
    }
  }, [projectId]);

  useEffect(() => {
    loadCommunications();
    loadStats();
  }, [loadCommunications, loadStats]);

  const handleCreated = () => {
    loadCommunications();
    loadStats();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Communications (Admin)</h1>
        <p className="text-sm text-slate-600">Create and track agency → client requests and client requests.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Unread</div>
          <div className="text-2xl font-semibold text-slate-900">{stats.unread}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Open</div>
          <div className="text-2xl font-semibold text-slate-900">{stats.statusCounts.open || 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Overdue</div>
          <div className="text-2xl font-semibold text-rose-600">{stats.overdue}</div>
        </div>
      </div>

      <CreateAdminRequestForm projectId={projectId} onCreated={handleCreated} />

      {loading && (
        <div className="rounded-lg border border-slate-200 p-4 text-slate-600">Loading communications...</div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      )}
      {!loading && !error && (
        <CommunicationsList projectId={projectId} communications={communications} />
      )}
    </div>
  );
}
