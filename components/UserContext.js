'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth';

const UserContext = createContext({});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  
  // Helper function to fetch profile using API (which uses service role)
  const fetchProfileFromAPI = async () => {
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
      console.error('Error fetching profile from API:', error);
    }
    return null;
  };

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user && !error) {
          setUser(user);

          // Get user profile using API (which uses service role to bypass RLS)
          const profileData = await fetchProfileFromAPI();

          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
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
          console.log('UserContext (SIGNED_IN): Profile loaded', { email: session.user.email, role: profileData?.role });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          router.push('/auth/login');
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
          
          // Refresh profile using API
          const profileData = await fetchProfileFromAPI();
          
          setProfile(profileData);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
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
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  const hasRole = (requiredRole) => {
    return profile?.role === requiredRole;
  };

  const hasProjectRole = async (projectId, requiredRole) => {
    if (!user) return false;

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
      console.error('Error checking project role:', error);
      return false;
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