'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      if (!supabase) {
        setStatus('Unable to initialize authentication client. Please try logging in again.');
        return;
      }

      try {
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle errors from Supabase
        if (error) {
          console.error('[AuthCallback] Error from Supabase:', error, errorDescription);
          setStatus(errorDescription || 'Authentication failed. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
          return;
        }

        // Let Supabase handle the callback automatically
        // This properly handles PKCE and all auth flows
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setStatus('Failed to establish session. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
          return;
        }

        if (data?.session) {
          console.log('[AuthCallback] Session established successfully');
          // Session is already stored by Supabase, just redirect
          setStatus('Session established! Redirecting…');
          await new Promise(resolve => setTimeout(resolve, 300));
          router.replace('/auth/login?authenticated=true');
          return;
        }

        // If no session yet, it might still be processing
        // Wait a moment and check again
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: retryData } = await supabase.auth.getSession();
        if (retryData?.session) {
          console.log('[AuthCallback] Session established on retry');
          setStatus('Session established! Redirecting…');
          router.replace('/auth/login?authenticated=true');
        } else {
          console.error('[AuthCallback] No session after retry');
          setStatus('Authentication failed. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
        }
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
