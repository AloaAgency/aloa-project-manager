'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
export default function UpdatePasswordEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
        <LoadingSpinner message="Loading..." size="default" />
      </div>
    }>
      <UpdatePasswordRedirector />
    </Suspense>
  );
}

function UpdatePasswordRedirector() {
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const redirectUrl = new URL(`${window.location.origin}/auth/callback`);
    redirectUrl.searchParams.set('next', '/auth/update-password/form');

    searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });

    const currentHash = window.location.hash;
    if (currentHash) {
      redirectUrl.hash = currentHash;
    }

    window.location.replace(redirectUrl.toString());
  }, [queryKey]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      <LoadingSpinner message="Redirecting…" size="default" />
    </div>
  );
}
