'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { createClient } from '@/lib/supabase-auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing secure verification...');
  const [errorMessage, setErrorMessage] = useState('');
  const retryRef = useRef(0);

  useEffect(() => {
    const processCallback = async () => {
      const supabase = createClient();
      if (!supabase) {
        setErrorMessage('Authentication client unavailable. Please try again.');
        setStatus('Authentication client unavailable. Please try again.');
        setTimeout(() => router.replace('/auth/login'), 3000);
        return;
      }

      try {
        // Attempt to recover the session directly
        const { data, error } = await supabase.auth.getSession();

        if (!data?.session && retryRef.current < 3) {
          retryRef.current += 1;
          setStatus('Confirming your session...');
          await new Promise((resolve) => setTimeout(resolve, 400 * retryRef.current));
          await processCallback();
          return;
        }

        if (data?.session) {
          const url = new URL(window.location.href);
          const nextParam = url.searchParams.get('next') || url.searchParams.get('redirect');
          const destination = nextParam && nextParam.startsWith('/')
            ? nextParam
            : '/auth/login?authenticated=true';

          setStatus('Verification complete! Redirecting...');
          setTimeout(() => {
            router.replace(destination);
          }, 250);
          return;
        }

        throw new Error('Unable to establish session from secure link.');
      } catch (err) {
        setErrorMessage(err.message || 'Verification failed. Please request a new link.');
        setStatus('Verification failed. Please request a new link.');
        setTimeout(() => router.replace('/auth/login'), 3500);
      }
    };

    processCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
      <LoadingSpinner message={errorMessage || status} size="default" />
    </div>
  );
}
