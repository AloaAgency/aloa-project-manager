'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth';

const UserContext = createContext({});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState(() => {
    // Initialize client immediately if we're in browser
    if (typeof window !== 'undefined') {
      return createClient();
    }
    return null;
  });
  const router = useRouter();

  // Helper function to fetch profile using API (which uses service role)
  const fetchProfileFromAPI = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.user?.profile || null;
      }
    } catch (error) {
      // Error fetching profile from API
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    // If we don't have a client yet (SSR), exit early
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial user
    const getUser = async () => {
      try {
        // First try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          // Try to refresh the session if there's an error
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession?.user && mounted) {
            setUser(refreshedSession.user);
            const profileData = await fetchProfileFromAPI();
            if (mounted) {
              setProfile(profileData);
            }
          } else if (mounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (session?.user) {
          if (mounted) {
            setUser(session.user);

            // Get user profile using API (which uses service role to bypass RLS)
            const profileData = await fetchProfileFromAPI();

            if (mounted) {
              setProfile(profileData);
            }
          }
        } else {
          // No session, clear everything
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        // On error, try one more time with refreshSession
        try {
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session?.user && mounted) {
            setUser(session.user);
            const profileData = await fetchProfileFromAPI();
            if (mounted) {
              setProfile(profileData);
            }
          }
        } catch (refreshError) {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          // Get user profile using API
          const profileData = await fetchProfileFromAPI();

          setProfile(profileData);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          // If signed out OR token refresh failed (no session), clear everything
          setUser(null);
          setProfile(null);
          // Don't redirect if on public form pages or auth pages
          if (!window.location.pathname.startsWith('/auth/') && !window.location.pathname.startsWith('/forms/')) {
            router.push('/auth/login');
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);

          // Refresh profile using API
          const profileData = await fetchProfileFromAPI();

          setProfile(profileData);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token successfully refreshed, update user
          setUser(session.user);

          // Refresh profile using API
          const profileData = await fetchProfileFromAPI();

          setProfile(profileData);
        }

        // Handle session expiration - if no session and we have a user, clear and redirect
        // But not on public form pages or auth pages
        if (!session && user) {
          setUser(null);
          setProfile(null);
          if (!window.location.pathname.startsWith('/auth/') && !window.location.pathname.startsWith('/forms/')) {
            router.push('/auth/login');
          }
        }
      }
    );

    // Set up session refresh interval (refresh every 30 minutes)
    const refreshInterval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setUser(null);
        setProfile(null);
        // Don't redirect if on public form pages or auth pages
        if (!window.location.pathname.startsWith('/auth/') && !window.location.pathname.startsWith('/forms/')) {
          router.push('/auth/login');
        }
      } else {
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Also refresh session when window regains focus
    // More aggressive for Safari private mode which may clear sessions
    const handleFocus = async () => {
      console.log('[UserContext] Window focused, checking session');

      try {
        // First try to get the current session
        let { data: { session }, error } = await supabase.auth.getSession();

        // If no session or error, try refreshing
        if (error || !session) {
          console.log('[UserContext] No session on focus, attempting refresh');
          const refreshResult = await supabase.auth.refreshSession();
          session = refreshResult.data?.session;
        }

        if (!session) {
          // Only redirect to login if we're not on an auth page or public form page
          if (!window.location.pathname.startsWith('/auth/') && !window.location.pathname.startsWith('/forms/')) {
            console.log('[UserContext] Session refresh failed, clearing state');
            setUser(null);
            setProfile(null);
            // Don't immediately redirect in Safari private mode, give user a chance to refresh
            if (!/safari/i.test(navigator.userAgent) || !/webkit/i.test(navigator.userAgent)) {
              router.push('/auth/login');
            }
          }
        } else if (session?.user) {
          // Session is valid, only update if user actually changed
          // Compare by ID and email to avoid unnecessary updates
          if (!user || user.id !== session.user.id || user.email !== session.user.email) {
            console.log('[UserContext] Session valid, user actually changed, updating');
            setUser(session.user);
            const profileData = await fetchProfileFromAPI();
            setProfile(profileData);
          } else {
            console.log('[UserContext] Session valid, no changes needed');
          }
        }
      } catch (error) {
        console.error('[UserContext] Error handling focus:', error);
      }
    };

    window.addEventListener('focus', handleFocus);

    // For Safari private mode, also check on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, fetchProfileFromAPI, supabase]);

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {

    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    try {
      // Use the API endpoint to update profile (which uses service role)
      const response = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setProfile(result.data);
      return { data: result.data, error: null };
    } catch (error) {

      return { data: null, error };
    }
  };

  const hasRole = (requiredRole) => {
    return profile?.role === requiredRole;
  };

  const hasProjectRole = async (projectId, requiredRole) => {
    if (!user || !supabase) return false;

    try {
      const { data } = await supabase
        .from('aloa_project_members')
        .select('project_role')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (!data) return false;

      const roleHierarchy = ['viewer', 'editor', 'admin', 'owner'];
      const requiredIndex = roleHierarchy.indexOf(requiredRole);
      const userIndex = roleHierarchy.indexOf(data.project_role);

      return userIndex >= requiredIndex;
    } catch (error) {

      return false;
    }
  };

  // Add a manual refresh function
  const refreshAuth = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfileFromAPI();
        setProfile(profileData);

      } else {
        setUser(null);
        setProfile(null);
        router.push('/auth/login');
      }
    } catch (error) {

      setUser(null);
      setProfile(null);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    updateProfile,
    hasRole,
    hasProjectRole,
    refreshAuth,
    isAuthenticated: !!user,
    isSuperAdmin: profile?.role === 'super_admin',
    isProjectAdmin: profile?.role === 'project_admin' || profile?.role === 'super_admin',
    isTeamMember: ['team_member', 'project_admin', 'super_admin'].includes(profile?.role),
    isClient: profile?.role === 'client'
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}