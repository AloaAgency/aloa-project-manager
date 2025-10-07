'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Mail, Key } from 'lucide-react';

function LoginOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'verify'
  const [otpSentTime, setOtpSentTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const otpInputRef = useRef(null);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('otpLoginState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const elapsed = Date.now() - state.otpSentTime;

        // Only restore if less than 15 minutes have passed
        if (state.otpSentTime && elapsed < 900000) {
          setEmail(state.email);
          setStep('verify');
          setOtpSentTime(state.otpSentTime);
          setSuccess('Please enter the 6-digit code sent to your email.');
        } else {
          // Clear expired state
          sessionStorage.removeItem('otpLoginState');
        }
      } catch (e) {
        sessionStorage.removeItem('otpLoginState');
      }
    }
  }, []);

  // Timer to show OTP expiration countdown
  useEffect(() => {
    if (otpSentTime && step === 'verify') {
      const timer = setInterval(() => {
        const elapsed = Date.now() - otpSentTime;
        const remaining = Math.max(0, 900000 - elapsed); // 15 minutes in ms
        setTimeRemaining(Math.floor(remaining / 1000));

        if (remaining === 0) {
          setError('Your code has expired. Please request a new one.');
          setStep('email');
          setOtp('');
          setOtpSentTime(null);
          sessionStorage.removeItem('otpLoginState');
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [otpSentTime, step]);

  // Auto-focus OTP input when step changes to verify
  useEffect(() => {
    if (step === 'verify' && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'magiclink' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setSuccess(data.message || 'If an account exists for this email, a 6-digit code has been sent.');
      setStep('verify');
      const sentTime = Date.now();
      setOtpSentTime(sentTime);

      // Save state to sessionStorage to persist across any page refreshes
      sessionStorage.setItem('otpLoginState', JSON.stringify({
        email,
        otpSentTime: sentTime
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: otp,
          type: 'magiclink'
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setSuccess('Login successful! Redirecting...');

      // Sync Supabase client session so client-side checks succeed immediately
      if (data.session) {
        try {
          const { createClient } = await import('@/lib/supabase-auth');
          const supabase = createClient();

          // Clear any stale local session first to avoid mismatched tokens
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});

          // Short delay gives the sign-out a moment to propagate
          await new Promise(resolve => setTimeout(resolve, 50));

          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (setSessionError) {
            console.error('[LoginOTP] Failed to set client session:', setSessionError);
          }
        } catch (sessionError) {
          console.error('[LoginOTP] Unable to sync client session:', sessionError);
        }
      }

      // Clear the saved state
      sessionStorage.removeItem('otpLoginState');

      // Redirect based on user role
      const redirectTo = searchParams.get('redirectTo') || data.redirectTo || '/dashboard';

      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            {step === 'email' ? (
              <Mail className="w-8 h-8 text-white" />
            ) : (
              <Key className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'email' ? 'Sign In with Email' : 'Enter Verification Code'}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 'email'
              ? 'Enter your email to receive a login code'
              : 'Enter the 6-digit code sent to your email'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndLogin} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="otp"
                ref={otpInputRef}
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="000000"
                maxLength="6"
                pattern="[0-9]{6}"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-digit code sent to {email}
              </p>
              {timeRemaining > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Code expires in: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
                setOtpSentTime(null);
                sessionStorage.removeItem('otpLoginState');
              }}
              className="w-full text-sm text-purple-600 hover:text-purple-700"
            >
              Didn't receive the code? Start over
            </button>
          </form>
        )}

        <div className="mt-6 text-center space-y-2">
          <a
            href="/auth/login"
            className="block text-sm text-purple-600 hover:text-purple-700"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">Loading...</div>}>
      <LoginOTPContent />
    </Suspense>
  );
}
