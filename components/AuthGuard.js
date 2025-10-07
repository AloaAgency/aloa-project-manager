'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth';
import { Lock, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function AuthGuard({
  children,
  allowedRoles = [],
  redirectTo = '/auth/login',
  requireAuth = true
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Checking permissions');
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);
  const hasRedirected = useRef(false);

  const clearSession = async () => {
    try {
      const supabase = createClient();
      await supabase?.auth.signOut();
    } catch (signOutError) {
      console.warn('[AuthGuard] Failed to clear local Supabase session', signOutError);
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (logoutError) {
      console.warn('[AuthGuard] Failed to clear server-side session', logoutError);
    }
  };

  useEffect(() => {
    // Check if we just logged in
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn) {
      sessionStorage.removeItem('justLoggedIn');
      // Add a small delay to ensure cookies are fully set
      setTimeout(() => {
        checkAuth();
      }, 500);
    } else {
      checkAuth();
    }

    // Progressive loading messages
    const timer = setTimeout(() => {
      setLoadingMessage('Loading application');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      // Get profile from API (server-side auth is more reliable)

      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();

      // If API returns unauthorized, user is not authenticated
      if (!response.ok || data.error === 'Not authenticated') {
        // If we just logged in and this is the first attempt, retry once
        const justLoggedIn = sessionStorage.getItem('justLoggedIn');
        if (justLoggedIn && retryCount === 0) {
          // Wait a bit longer and retry
          setTimeout(() => {
            checkAuth(1);
          }, 1000);
          return;
        }

        await clearSession();

        if (requireAuth) {
          // Check if we're already on the login page to avoid redirect loop
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/auth/')) {
            // Already on an auth page, don't redirect again
            setAuthorized(false);
            setError('Your session has expired. Please login again.');
          } else {
            // Redirect to login page with return URL
            const returnUrl = currentPath + window.location.search;
            if (!hasRedirected.current) {
              hasRedirected.current = true;
              router.push(`${redirectTo}?message=Session expired, please login&redirect=${encodeURIComponent(returnUrl)}`);
            }
          }
        } else {
          setAuthorized(true);
        }
        setLoading(false);
        return;
      }

      if (!response.ok || data.error) {

        setError('Unable to verify user permissions: ' + (data.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      if (!data.user || !data.user.role) {
        setError('User profile incomplete. Please contact support.');
        setLoading(false);
        return;
      }

      // Clear the justLoggedIn flag if it exists
      sessionStorage.removeItem('justLoggedIn');

      // Get the role - prioritize the direct user.role over profile.role
      const actualRole = data.user.role || data.user.profile?.role;
      setUserRole(actualRole);

      // Check if user role is allowed
      if (allowedRoles.length > 0) {

        const isAllowed = allowedRoles.includes(actualRole);

        if (!isAllowed) {

          setError(`Access denied. This area is restricted to: ${allowedRoles.join(', ')}`);
          setAuthorized(false);
        } else {

          setAuthorized(true);
        }
      } else {
        // If no specific roles required, just check authentication

        setAuthorized(true);
      }

      setLoading(false);
    } catch (error) {

      setError('An error occurred while checking permissions');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
        <LoadingSpinner message={loadingMessage} size="default" />
      </div>
    );
  }

  if (error || !authorized) {
    return (
      <div className="flex items-center justify-center p-4 py-32">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Access Restricted
          </h1>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-800 text-sm">
                  {error || 'You do not have permission to access this page.'}
                </p>
                {userRole && (
                  <p className="text-red-600 text-xs mt-1">
                    Your role: <span className="font-semibold">{userRole}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>

            <button
              onClick={() => {
                // Don't clear cookies here - just redirect to login
                // The login page will handle proper authentication
                router.push('/auth/login');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
