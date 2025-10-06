'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing magic link...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      if (!supabase) {
        setStatus('Unable to initialize authentication client. Please try logging in again.');
        return;
      }

      try {
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get('token_hash') || url.searchParams.get('token');
        const codeParam = url.searchParams.get('code');
        let sessionResult = null;

        if (tokenHash) {
          console.log('[AuthCallback] Verifying magic link token');
          const { data, error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
          if (error) {
            console.error('[AuthCallback] verifyOtp failed:', error);
          } else {
            sessionResult = data;
          }
        }

        if (!sessionResult && codeParam) {
          console.log('[AuthCallback] Exchanging code for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(codeParam);
          if (error) {
            console.error('[AuthCallback] Code exchange failed:', error);
          } else {
            sessionResult = data;
          }
        }

        if (!sessionResult) {
          console.log('[AuthCallback] Retrieving session from URL via getSessionFromUrl');
          const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) {
            console.error('[AuthCallback] Failed to establish session:', error);
            setStatus('This link has expired or is invalid. Request a new login link.');
            setTimeout(() => router.replace('/auth/login'), 3000);
            return;
          }
          sessionResult = data;
        }

        if (sessionResult?.session) {
          console.log('[AuthCallback] Client session retrieved');
          const { access_token, refresh_token, expires_in } = sessionResult.session;
          try {
            console.log('[AuthCallback] Persisting server session');
            const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ access_token, refresh_token })
            });
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({}));
              console.error('[AuthCallback] Failed to persist session on server', response.status, errorBody);
            } else {
              console.log('[AuthCallback] Server session persisted successfully', { expires_in });
            }
          } catch (persistError) {
            console.error('[AuthCallback] Session persistence error:', persistError);
          }
        } else {
          console.warn('[AuthCallback] No session returned from Supabase');
        }

        // Clean up the URL by removing any auth query params / hashes
        window.history.replaceState({}, '', window.location.pathname);

        setStatus('Session established! Redirecting…');
        await new Promise(resolve => setTimeout(resolve, 300));
        router.replace('/auth/login?authenticated=true');
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setStatus('An unexpected error occurred. Please log in again.');
        setTimeout(() => router.replace('/auth/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
      <LoadingSpinner message={status} size="default" />
    </div>
  );
}
