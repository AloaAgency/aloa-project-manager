'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Preparing password reset…');

  const queryKey = searchParams.toString();

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          setStatus('Unable to initialize authentication client.');
          setTimeout(() => router.replace('/auth/reset-password?error=Authentication unavailable'), 1500);
          return;
        }

        const hashParams = new URLSearchParams((typeof window !== 'undefined' && window.location.hash?.substring(1)) || '');
        const queryCode = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!(accessToken && refreshToken) && !queryCode) {
          const type = hashParams.get('type');
          if (type !== 'recovery') {
            router.replace('/auth/reset-password?error=Invalid or expired reset link');
            return;
          }
        }

        setStatus('Verifying reset link…');

        let sessionTokens = null;

        if (queryCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (error) {
            throw error;
          }
          sessionTokens = {
            access_token: data?.session?.access_token,
            refresh_token: data?.session?.refresh_token,
          };
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            throw error;
          }
          sessionTokens = { access_token: accessToken, refresh_token: refreshToken };
        }

        if (!sessionTokens?.access_token || !sessionTokens?.refresh_token) {
          throw new Error('Missing session tokens from reset link');
        }

        const persistResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(sessionTokens)
        });

        if (!persistResponse.ok) {
          const persistError = await persistResponse.json().catch(() => ({}));
          throw new Error(persistError?.error || 'Unable to store session');
        }

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }

        setStatus('Link verified. Redirecting…');
        setTimeout(() => router.replace('/auth/update-password/form'), 300);
      } catch (error) {
        console.error('[UpdatePassword] Failed to process reset link:', error);
        setStatus('Reset link is invalid or has expired. Redirecting…');
        setTimeout(() => router.replace('/auth/reset-password?error=Invalid or expired reset link'), 1500);
      }
    };

    handleRecovery();
  }, [router, queryKey]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      <LoadingSpinner message={status} size="default" />
    </div>
  );
}

export default function UpdatePasswordEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
        <LoadingSpinner message="Loading..." size="default" />
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
}
