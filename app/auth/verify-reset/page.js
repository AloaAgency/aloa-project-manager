'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Shield, AlertCircle } from 'lucide-react';

export default function VerifyResetPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState('');

  // Get all the parameters from the URL
  const code = searchParams.get('code');
  const token = searchParams.get('token');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  useEffect(() => {
    // Check if we have the necessary parameters
    if (!code && !token && !token_hash) {
      setError('Invalid reset link. Please request a new password reset.');
      setStatus('error');
    }
  }, [code, token, token_hash]);

  const handleVerifyReset = async () => {
    setStatus('processing');
    setError('');

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Unable to initialize authentication');
      }

      // Build the callback URL with all the original parameters
      const callbackUrl = new URL(window.location.origin + '/auth/callback');

      // Copy all search params to the callback URL
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });

      // Also preserve any hash fragment
      if (window.location.hash) {
        callbackUrl.hash = window.location.hash;
      }

      console.log('[VerifyReset] Redirecting to callback with preserved params');

      // Now redirect to the callback with all parameters intact
      // This redirect happens ONLY when user clicks the button (not on prefetch)
      window.location.href = callbackUrl.toString();

    } catch (err) {
      console.error('[VerifyReset] Error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
        <LoadingSpinner message="Verifying your reset link..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Password Reset Verification
          </h2>

          <p className="text-gray-600 mb-6">
            Click the button below to verify your identity and reset your password.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyReset}
            disabled={status === 'error'}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify and Reset Password
          </button>

          <div className="mt-6 text-sm text-gray-500">
            <p className="font-semibold mb-2">Why this extra step?</p>
            <p>
              This verification step prevents your email client from accidentally
              consuming your one-time reset token when it previews the link.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <a
              href="/auth/reset-password"
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Request a new reset link
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}