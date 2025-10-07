'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing password reset...');

  useEffect(() => {
    const handlePasswordReset = async () => {
      // Prevent double execution
      const processKey = '__password_reset_processing__';
      if (window[processKey]) {
        return;
      }
      window[processKey] = true;

      const supabase = createClient();
      if (!supabase) {
        setStatus('Unable to initialize authentication client.');
        return;
      }

      try {
        // Check for error in URL
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus(errorDescription || 'Password reset failed. Please try again.');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        // First, try to get the current session (Supabase may have auto-detected the token)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          // Try to exchange the code if present
          const code = searchParams.get('code');
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              setStatus('Invalid or expired reset link. Please request a new one.');
              setTimeout(() => router.push('/auth/reset-password'), 3000);
              return;
            }

            if (exchangeData?.session) {
              setStatus('Verified! Redirecting to password update form...');
              await new Promise(resolve => setTimeout(resolve, 500));
              router.push('/auth/update-password/form');
              return;
            }
          }
        }

        if (sessionData?.session) {
          setStatus('Verified! Redirecting to password update form...');
          await new Promise(resolve => setTimeout(resolve, 500));
          router.push('/auth/update-password/form');
          return;
        }

        // If no session and no code, wait a bit for Supabase to process
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check one more time
        const { data: retryData } = await supabase.auth.getSession();
        if (retryData?.session) {
          setStatus('Verified! Redirecting to password update form...');
          router.push('/auth/update-password/form');
        } else {
          setStatus('Invalid or expired reset link. Please request a new one.');
          setTimeout(() => router.push('/auth/reset-password'), 3000);
        }
      } catch (err) {
        setStatus('An error occurred. Please try again.');
        window[processKey] = false;
        setTimeout(() => router.push('/auth/reset-password'), 3000);
      }
    };

    handlePasswordReset();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
      <LoadingSpinner message={status} size="default" />
    </div>
  );
}