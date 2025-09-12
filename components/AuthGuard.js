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
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        if (requireAuth) {
          console.log('No authenticated user, redirecting to login');
          router.push(`${redirectTo}?message=Please login to continue`);
        } else {
          setAuthorized(true);
        }
        setLoading(false);
        return;
      }

      // Get user profile with role using API endpoint to bypass RLS issues
      console.log('Fetching profile for user:', user.id, user.email);
      
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      
      console.log('Profile API response:', data);
      
      if (!response.ok || data.error) {
        console.error('Error fetching user profile:', data.error);
        setError('Unable to verify user permissions: ' + (data.error || 'Unknown error'));
        setLoading(false);
        return;
      }
      
      if (!data.user || !data.user.role) {
        console.error('No user role found in response');
        setError('User profile incomplete. Please contact support.');
        setLoading(false);
        return;
      }
      
      const profile = data.user.profile || { role: data.user.role };
      setUserRole(profile.role);
      console.log('User role set to:', profile.role);

      // Check if user role is allowed
      if (allowedRoles.length > 0) {
        console.log('Checking role access:', {
          userRole: profile.role,
          allowedRoles: allowedRoles,
          isIncluded: allowedRoles.includes(profile.role)
        });
        
        const isAllowed = allowedRoles.includes(profile.role);
        
        if (!isAllowed) {
          console.log(`User role ${profile.role} not in allowed roles:`, allowedRoles);
          setError(`Access denied. This area is restricted to: ${allowedRoles.join(', ')}`);
          setAuthorized(false);
        } else {
          console.log('Access granted for role:', profile.role);
          setAuthorized(true);
        }
      } else {
        // If no specific roles required, just check authentication
        console.log('No specific roles required, user is authenticated');
        setAuthorized(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setError('An error occurred while checking permissions');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error || !authorized) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
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
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}