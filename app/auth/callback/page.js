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
      // Prevent double execution in React StrictMode
      const callbackKey = '__auth_callback_triggered__';
      if (window[callbackKey]) {
        console.log('[AuthCallback] Callback already processing, skipping duplicate');
        return;
      }
      window[callbackKey] = true;

      const supabase = createClient();
      if (!supabase) {
        setStatus('Unable to initialize authentication client. Please try logging in again.');
        window[callbackKey] = false; // Reset flag on error
        return;
      }

      try {
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const errorCode = url.searchParams.get('error_code');

        console.log('[AuthCallback] Full URL:', window.location.href);
        console.log('[AuthCallback] URL params:', {
          error,
          errorCode,
          errorDescription,
          hasCode: url.searchParams.has('code'),
          hasToken: url.searchParams.has('token'),
          hasTokenHash: !!url.hash,
          hash: url.hash
        });

        // Handle errors from Supabase
        if (error) {
          console.error('[AuthCallback] Error from Supabase:', error, errorDescription);

          // Special handling for OTP expired - this is likely a token already consumed error
          if (errorCode === 'otp_expired') {
            console.log('[AuthCallback] Token likely already consumed. Checking for existing session...');
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              console.log('[AuthCallback] Session exists despite error, redirecting...');
              router.replace('/auth/login?authenticated=true');
              return;
            }
          }

          setStatus(errorDescription || 'Authentication failed. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
          return;
        }

        // Extract the token or code from the URL
        const code = url.searchParams.get('code');
        const token_hash = url.hash;

        console.log('[AuthCallback] Processing auth callback:', {
          hasCode: !!code,
          hasTokenHash: !!token_hash,
          pathname: url.pathname
        });

        // Wait a moment for Supabase to process the URL (since detectSessionInUrl is now true)
        // This gives Supabase time to detect and process auth parameters from the URL
        console.log('[AuthCallback] Waiting for Supabase to process auth parameters...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to get the session (may have been set by detectSessionInUrl)
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setStatus('Failed to establish session. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
          return;
        }

        if (data?.session) {
          console.log('[AuthCallback] Session established successfully');
          setStatus('Authentication successful! Redirecting...');
          await new Promise(resolve => setTimeout(resolve, 300));

          // Check for redirect parameter
          const next = url.searchParams.get('next');
          if (next && next.startsWith('/')) {
            router.replace(next);
          } else {
            router.replace('/auth/login?authenticated=true');
          }
          return;
        }

        // If no session yet, wait a bit and try once more
        console.log('[AuthCallback] No session found, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: retryData } = await supabase.auth.getSession();
        if (retryData?.session) {
          console.log('[AuthCallback] Session established on retry');
          setStatus('Authentication successful! Redirecting...');

          const next = url.searchParams.get('next');
          if (next && next.startsWith('/')) {
            router.replace(next);
          } else {
            router.replace('/auth/login?authenticated=true');
          }
        } else {
          console.error('[AuthCallback] No session after retry');
          setStatus('Authentication failed. Please try logging in again.');
          setTimeout(() => router.replace('/auth/login'), 3000);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setStatus('An unexpected error occurred. Please log in again.');
        window['__auth_callback_triggered__'] = false; // Reset flag on error
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
