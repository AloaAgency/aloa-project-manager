import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client for client-side operations
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Helper function to get the current user
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get the user profile with role information
  const { data: profile } = await supabase
    .from('aloa_user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    ...user,
    profile
  };
}

// Helper function to check if user has a specific role
export async function hasRole(requiredRole) {
  const user = await getCurrentUser();
  return user?.profile?.role === requiredRole;
}

// Helper function to check project-specific permissions
export async function hasProjectPermission(projectId, permission) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data: member } = await supabase
    .from('aloa_project_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .single();

  if (!member) return false;

  // Check specific permission or role-based permission
  if (permission === 'view') {
    return true; // All members can view
  }
  
  if (permission === 'edit') {
    return member.can_edit || ['owner', 'admin', 'editor'].includes(member.project_role);
  }
  
  if (permission === 'delete') {
    return member.can_delete || ['owner', 'admin'].includes(member.project_role);
  }
  
  if (permission === 'manage') {
    return member.can_manage_team || ['owner', 'admin'].includes(member.project_role);
  }

  return false;
}

// Helper function to sign out
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
}

// Helper function to sign in with email and password
export async function signInWithEmail(email, password) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { user: data.user };
}

// Helper function to sign in with magic link
export async function signInWithMagicLink(email) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

// Helper function to sign up
export async function signUp(email, password, fullName = '') {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { user: data.user };
}

// Helper function to reset password
export async function resetPassword(email) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

// Helper function to update password
export async function updatePassword(newPassword) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

// Helper function to log user activity
export async function logActivity(action, projectId = null, resourceType = null, resourceId = null, details = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  try {
    await supabase.rpc('aloa_log_user_activity', {
      p_user_id: user.id,
      p_project_id: projectId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}