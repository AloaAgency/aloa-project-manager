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

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && !error) {
          setUser(user);
          
          // Get user profile
          const { data: profileData } = await supabase
            .from('aloa_user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
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
          
          // Get user profile
          const { data: profileData } = await supabase
            .from('aloa_user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profileData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          router.push('/auth/login');
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
          
          // Refresh profile
          const { data: profileData } = await supabase
            .from('aloa_user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
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
      const { data, error } = await supabase
        .from('aloa_user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return { data, error: null };
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