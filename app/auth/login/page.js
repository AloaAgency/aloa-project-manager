'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithMagicLink } from '@/lib/supabase-auth';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'magic'

  // Add debug logging to see what's happening on mount
  useEffect(() => {
    console.log('[LoginPage] Component mounted');

    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthenticated = urlParams.get('authenticated') === 'true';
    const errorParam = urlParams.get('error');
    const clearAuth = urlParams.get('clear_auth');

    // If clear_auth flag is set, force clear all auth cookies on client side
    if (clearAuth === '1') {
      console.log('[LoginPage] Force clearing client-side auth state');

      // Clear all Supabase-related cookies
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName.includes('sb-') || cookieName.includes('supabase')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        }
      }

      // Clear localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      // Remove the clear_auth param and reload to ensure clean state
      urlParams.delete('clear_auth');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);

      // IMPORTANT: Don't proceed with auth checks - we just cleared everything
      // Just show the login form and let the user log in fresh
      return;
    }

    // Display error messages from URL params
    if (errorParam === 'session_expired') {
      setError('Your session has expired. Please login again.');
    } else if (errorParam === 'stale_session') {
      setError('Your session is no longer valid. Please login again.');
    }

    // Check if user is already authenticated (from URL param)
    if (isAuthenticated) {
      // User is authenticated but redirected here (likely a client user)
      // Fetch their profile and redirect to their project
      checkAuthAndRedirect();
    }

    return () => {
      console.log('[LoginPage] Component unmounted');
    };
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[LoginPage] Authenticated user profile:', data);
        if (data.user) {
          const role = data.user.role;
          const projectId = data.clientProject?.id;

          if (role === 'super_admin' || role === 'project_admin' || role === 'team_member') {
            window.location.href = '/admin/projects';
            return;
          }

          if (['client', 'client_admin', 'client_participant'].includes(role) && projectId) {
            window.location.href = `/project/${projectId}/dashboard`;
            return;
          }
        }
      }
    } catch (err) {
      console.error('[LoginPage] Error checking auth:', err);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Use server-side API route for login
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      let response;
      try {
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password
          }),
          signal: controller.signal
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          setError('Login request timed out. Please try again.');
        } else {
          setError('Network error: ' + fetchError.message);
        }
        setLoading(false);
        return;
      }
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok || result.error) {
        setError(result.error || 'Login failed');
        setLoading(false);
      } else if (result.success) {
        
        // If we have a session, set it in the client and verify it
        if (result.session) {
          const { createClient } = await import('@/lib/supabase-auth');
          const supabase = createClient();

          // Set the session
          await supabase.auth.setSession(result.session);

          // Wait a moment for session to propagate
          await new Promise(resolve => setTimeout(resolve, 200));

          // Verify session was actually set (important for private/incognito tabs)
          const { data: { session: verifiedSession } } = await supabase.auth.getSession();

          if (!verifiedSession) {
            // Try setting session again
            await supabase.auth.setSession(result.session);
            await new Promise(resolve => setTimeout(resolve, 300));

            // Check one more time
            const { data: { session: retriedSession } } = await supabase.auth.getSession();
            if (!retriedSession) {
              setError('Session could not be established. Please try logging in again.');
              setLoading(false);
              return;
            }
          }

        }

        // Additional delay for private/incognito tabs to ensure cookies are written
        await new Promise(resolve => setTimeout(resolve, 300));

        // Role-based redirection
        const userRole = result.user?.role;


        // Use window.location.href for a full page refresh to ensure cookies are properly set
        if (userRole === 'super_admin' || userRole === 'project_admin' || userRole === 'team_member') {
          // Admin users go to admin projects page
          window.location.href = '/admin/projects';
        } else if (['client', 'client_admin', 'client_participant'].includes(userRole)) {
          // Client users - check for project
          if (result.clientProject?.id) {
            window.location.href = `/project/${result.clientProject.id}/dashboard`;
          } else {
            // Client without a project - should not have access to admin areas
            setError('No project assigned to your account. Please contact your administrator.');
            setLoading(false);
            return;
          }
        } else if (!userRole) {
          // No role found - likely a new user or data issue
          window.location.href = '/admin/projects';
        } else {
          // Unexpected role - log error but still redirect somewhere safe
          window.location.href = '/admin/projects';
        }
      } else {
        setError('Login failed - please try again');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + err.message);
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { signInWithMagicLink } = await import('@/lib/supabase-auth');

      const result = await signInWithMagicLink(email);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Check your email for the login link!');
      }
    } catch (err) {
      console.error('[LoginPage] Magic link error:', err);
      setError(err?.message ? `An unexpected error occurred: ${err.message}` : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add a loading indicator to prevent blank page while checking auth
  const [isPageReady, setIsPageReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure the page is visible
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isPageReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading login page...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access is by invitation only
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Login method tabs */}
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'password'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('magic')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'magic'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Magic Link
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {loginMethod === 'password' ? (
            <form className="space-y-6" onSubmit={handlePasswordLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/auth/reset-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleMagicLinkLogin}>
              <div>
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="magic-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending link...' : 'Send magic link'}
                </button>
              </div>

              <div className="text-sm text-gray-600 text-center">
                We'll send you a link to sign in without a password
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
