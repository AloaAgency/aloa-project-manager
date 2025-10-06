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
        const hashParams = new URLSearchParams(url.hash ? url.hash.substring(1) : '');
        const tokenHash = url.searchParams.get('token_hash') || url.searchParams.get('token');
        const queryType = url.searchParams.get('type') || hashParams.get('type');
        const emailParam = url.searchParams.get('email') || undefined;
        const accessToken = hashParams.get('access_token') || url.searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || url.searchParams.get('refresh_token');

        let session = null;

        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Restoring session from access/refresh tokens');
          const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            console.error('[AuthCallback] setSession failed:', error);
            throw error;
          }
          session = data?.session ?? null;
        } else if (tokenHash) {
          const tokenType = queryType === 'recovery' ? 'recovery' : 'magiclink';
          console.log('[AuthCallback] Verifying', tokenType, 'token');
          const { data, error } = await supabase.auth.verifyOtp({
            type: tokenType,
            token_hash: tokenHash,
            email: emailParam
          });
          if (error) {
            console.error('[AuthCallback] verifyOtp failed:', error);
            throw error;
          }
          session = data?.session ?? null;
        }

        if (!session) {
          const { data: fallbackSession } = await supabase.auth.getSession();
          session = fallbackSession?.session ?? null;
        }

        if (!session) {
          console.warn('[AuthCallback] No session found in URL');
          setStatus('This link has expired or is invalid. Request a new login link.');
          setTimeout(() => router.replace('/auth/login'), 3000);
          return;
        }

        const { access_token, refresh_token } = session;
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
          }
        } catch (persistError) {
          console.error('[AuthCallback] Session persistence error:', persistError);
        }

        // Clean up the URL by removing any auth query params / hashes
        window.history.replaceState({}, '', window.location.pathname);

        setStatus('Session established! Redirecting…');
        await new Promise(resolve => setTimeout(resolve, 300));

        const nextParam = url.searchParams.get('next');
        const destination = nextParam && nextParam.startsWith('/')
          ? nextParam
          : '/auth/login?authenticated=true';

        router.replace(destination);
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
