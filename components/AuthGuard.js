'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Lock, AlertCircle } from 'lucide-react';

export default function AuthGuard({ 
  children, 
  allowedRoles = [],
  redirectTo = '/auth/login',
  requireAuth = true 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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
        if (requireAuth) {

          router.push(`${redirectTo}?message=Please login to continue`);
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
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
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