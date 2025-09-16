import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase-service';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

// POST - Assign user to project
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const { user_id, project_id, role = 'client' } = body;
    
    console.log('Assign project request:', { user_id, project_id, role });

    if (!user_id || !project_id) {
      return NextResponse.json({ 
        error: 'User ID and Project ID are required' 
      }, { status: 400 });
    }

    // Create Supabase client for auth
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    
    // Create service role client for database operations (bypasses RLS)
    const supabase = createServiceClient();

    // Check if requester is authenticated
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is super admin or project admin for this project
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      // Check if user is project admin for this specific project
      const { data: teamMember } = await supabase
        .from('aloa_project_members')
        .select('project_role')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.project_role !== 'admin') {
        return NextResponse.json({ 
          error: 'Forbidden - Super admin or project admin access required' 
        }, { status: 403 });
      }
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('aloa_project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'User is already assigned to this project' 
      }, { status: 400 });
    }

    // Add user as project member
    // Note: invited_by might be null if the current user isn't in aloa_user_profiles yet
    const { error: memberError } = await supabase
      .from('aloa_project_members')
      .insert({
        project_id,
        user_id,
        project_role: ['client', 'client_admin', 'client_participant'].includes(role) ? 'viewer' : role,
        can_edit: false,
        can_delete: false,
        can_invite: false,
        can_manage_team: false,
        invited_by: null, // Set to null to avoid foreign key constraint issues
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error adding project member:', memberError);
      console.error('Error details:', {
        code: memberError.code,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint
      });
      return NextResponse.json({ 
        error: `Failed to assign user to project: ${memberError.message}` 
      }, { status: 500 });
    }

    // Log the assignment in timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id,
        event_type: 'user_assigned',
        description: `User assigned to project as ${role}`,
        created_by: user.id,
        metadata: { user_id, role }
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Assign project API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove user from project
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const project_id = searchParams.get('project_id');

    if (!user_id || !project_id) {
      return NextResponse.json({ 
        error: 'User ID and Project ID are required' 
      }, { status: 400 });
    }

    // Create Supabase client for auth
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    
    // Create service role client for database operations (bypasses RLS)
    const supabase = createServiceClient();

    // Check if requester is authenticated
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is super admin or project admin for this project
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      // Check if user is project admin for this specific project
      const { data: teamMember } = await supabase
        .from('aloa_project_members')
        .select('project_role')
        .eq('project_id', project_id)
        .eq('user_id', user.id)
        .single();

      if (!teamMember || teamMember.project_role !== 'admin') {
        return NextResponse.json({ 
          error: 'Forbidden - Super admin or project admin access required' 
        }, { status: 403 });
      }
    }

    // Remove user from project members
    const { error: deleteError } = await supabase
      .from('aloa_project_members')
      .delete()
      .eq('project_id', project_id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error removing project member:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to remove user from project' 
      }, { status: 500 });
    }

    // Log the removal in timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id,
        event_type: 'user_removed',
        description: 'User removed from project',
        created_by: user.id,
        metadata: { user_id }
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove from project API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}