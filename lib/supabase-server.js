import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create a Supabase client for server-side operations
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors in server components
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors in server components
          }
        }
      }
    }
  );
}

// Helper function to get the current user (server-side)
export async function getCurrentUser() {
  const supabase = createClient();
  
  try {
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
  } catch (error) {
    return null;
  }
}

// Helper function to require authentication
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// Helper function to require specific role
export async function requireRole(requiredRole) {
  const user = await requireAuth();
  
  if (user.profile?.role !== requiredRole) {
    throw new Error('Insufficient permissions');
  }
  
  return user;
}

// Helper function to check project membership
export async function getProjectMembership(userId, projectId) {
  const supabase = createClient();
  
  const { data: member, error } = await supabase
    .from('aloa_project_members')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (error || !member) {
    return null;
  }

  return member;
}

// Helper function to require project permission
export async function requireProjectPermission(projectId, permission) {
  const user = await requireAuth();
  
  // Super admins have all permissions
  if (user.profile?.role === 'super_admin') {
    return user;
  }

  const member = await getProjectMembership(user.id, projectId);
  
  if (!member) {
    throw new Error('Not a member of this project');
  }

  // Check specific permission or role-based permission
  let hasPermission = false;
  
  switch (permission) {
    case 'view':
      hasPermission = true; // All members can view
      break;
    case 'edit':
      hasPermission = member.can_edit || ['owner', 'admin', 'editor'].includes(member.project_role);
      break;
    case 'delete':
      hasPermission = member.can_delete || ['owner', 'admin'].includes(member.project_role);
      break;
    case 'manage':
      hasPermission = member.can_manage_team || ['owner', 'admin'].includes(member.project_role);
      break;
    default:
      hasPermission = false;
  }

  if (!hasPermission) {
    throw new Error('Insufficient project permissions');
  }

  return { user, member };
}

// Helper function to log activity (server-side)
export async function logActivity(userId, action, projectId = null, resourceType = null, resourceId = null, details = {}, request = null) {
  const supabase = createClient();
  
  const activityData = {
    p_user_id: userId,
    p_project_id: projectId,
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_details: details
  };

  // Add request metadata if available
  if (request) {
    activityData.p_ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    activityData.p_user_agent = request.headers.get('user-agent');
  }

  try {
    await supabase.rpc('aloa_log_user_activity', activityData);
  } catch (error) {
    // Failed to log activity
  }
}