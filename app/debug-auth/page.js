'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function DebugAuth() {
  const [authData, setAuthData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();

      // Get auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      setAuthData({ user, error: authError });

      // Get profile from API
      try {
        const response = await fetch('/api/auth/profile');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        setProfileData({ error: error.message });
      }

      setLoading(false);
    }

    checkAuth();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Auth Debug Information</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Auth User</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(authData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Profile API Response</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Summary</h2>
          <div className="space-y-2">
            <p><strong>Email:</strong> {authData?.user?.email || 'Not found'}</p>
            <p><strong>User ID:</strong> {authData?.user?.id || 'Not found'}</p>
            <p><strong>Role from API:</strong> <span className="font-mono bg-yellow-100 px-2 py-1">{profileData?.user?.role || 'Not found'}</span></p>
            <p><strong>Profile Role:</strong> <span className="font-mono bg-blue-100 px-2 py-1">{profileData?.user?.profile?.role || 'Not found'}</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Links</h2>
          <div className="space-x-4">
            <a href="/admin/projects" className="text-blue-600 hover:underline">/admin/projects (works)</a>
            <a href="/admin/forms" className="text-blue-600 hover:underline">/admin/forms</a>
            <a href="/legacy-dashboard" className="text-blue-600 hover:underline">/legacy-dashboard</a>
          </div>
        </div>
      </div>
    </div>
  );
}