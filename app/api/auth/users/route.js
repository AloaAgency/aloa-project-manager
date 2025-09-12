import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

// GET - List all users (super admin only)
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
    // Create Supabase client with service role for bypassing RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Check if user is authenticated and is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get all users with their profiles
    const { data: users, error: usersError } = await supabase
      .from('aloa_user_profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get project assignments for client users
    const clientIds = users.filter(u => u.role === 'client').map(u => u.id);
    let projectAssignments = {};
    
    if (clientIds.length > 0) {
      // Create a service client to bypass RLS for fetching project members
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey
      );
      
      // Get from aloa_project_members table (where we actually store client assignments)
      const { data: members, error: membersError } = await serviceClient
        .from('aloa_project_members')
        .select('user_id, project_id, aloa_projects(id, project_name, client_name)')
        .in('user_id', clientIds)
        .eq('project_role', 'viewer'); // Clients are stored as 'viewer' role
      
      console.log('Members query with service client:', { members, error: membersError });
      
      if (members) {
        members.forEach(m => {
          if (!projectAssignments[m.user_id]) {
            projectAssignments[m.user_id] = [];
          }
          projectAssignments[m.user_id].push(m.aloa_projects);
        });
      }
    }

    // Add project info to users
    const usersWithProjects = users.map(user => ({
      ...user,
      projects: projectAssignments[user.id] || []
    }));

    // Debug: Log John G's data specifically
    const johnG = usersWithProjects.find(u => u.email === 'exabyte@me.com');
    if (johnG) {
      console.log('John G data being sent:', JSON.stringify(johnG, null, 2));
    }

    return NextResponse.json({ users: usersWithProjects });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new user (super admin only)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const { email, password, full_name, role = 'client', project_id } = body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return NextResponse.json({ 
        error: 'Email, password, and full name are required' 
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['super_admin', 'project_admin', 'team_member', 'client'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
      }, { status: 400 });
    }
    
    // Create Supabase client with service role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Check if requester is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Create the user account using admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ 
        error: createError.message || 'Failed to create user' 
      }, { status: 400 });
    }

    // Create or update the profile
    const { error: profileError } = await supabase
      .from('aloa_user_profiles')
      .upsert({
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Try to delete the user if profile creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ 
        error: 'Failed to create user profile' 
      }, { status: 500 });
    }

    // If role is client and project_id is provided, add them as stakeholder
    if (role === 'client' && project_id) {
      const { error: stakeholderError } = await supabase
        .from('aloa_project_stakeholders')
        .insert({
          project_id,
          user_id: newUser.user.id,
          role: 'client',
          added_by: user.id
        });

      if (stakeholderError) {
        console.error('Error adding stakeholder:', stakeholderError);
        // Don't fail the whole operation, just log the error
      }
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role,
        project_id: role === 'client' ? project_id : null
      }
    });

  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user (super admin only)
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const { user_id, updates } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Check if requester is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Update the profile
    const allowedUpdates = ['full_name', 'role'];
    const profileUpdates = {};
    
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        profileUpdates[key] = updates[key];
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('aloa_user_profiles')
        .update(profileUpdates)
        .eq('id', user_id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }
    }

    // Update email if provided
    if (updates.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email: updates.email }
      );

      if (emailError) {
        console.error('Error updating email:', emailError);
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
      }

      // Also update email in profiles table
      await supabase
        .from('aloa_user_profiles')
        .update({ email: updates.email })
        .eq('id', user_id);
    }

    // Update password if provided
    if (updates.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        user_id,
        { password: updates.password }
      );

      if (passwordError) {
        console.error('Error updating password:', passwordError);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user (super admin only)
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Check if requester is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete the user (this will cascade to profile)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}