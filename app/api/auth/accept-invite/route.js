import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const { token, password, email, full_name, role, project_id } = body;

    // Validate required fields
    if (!token || !password || !email || !full_name) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Create Supabase client with service role for admin operations
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );

    // Verify the invitation token
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('email', email)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid invitation' 
      }, { status: 400 });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ 
        error: 'This invitation has already been accepted' 
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Create the user account
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email since they came from invitation
      user_metadata: {
        full_name
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ 
        error: createError.message || 'Failed to create account' 
      }, { status: 400 });
    }

    // Create the profile
    console.log('Creating profile for user:', {
      id: newUser.user.id,
      email: newUser.user.email,
      full_name,
      role: invitation.role
    });
    
    const { error: profileError } = await serviceSupabase
      .from('aloa_user_profiles')
      .insert({
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: invitation.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        notification_settings: {
          email: true,
          in_app: true
        },
        preferences: {}
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      console.error('Profile error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      });
      
      // Try to delete the user if profile creation failed
      await serviceSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 });
    }

    // Add project associations based on role
    if (invitation.project_id) {
      if (invitation.role === 'client') {
        // Add as project member for client
        const { error: memberError } = await serviceSupabase
          .from('aloa_project_members')
          .insert({
            project_id: invitation.project_id,
            user_id: newUser.user.id,
            role: 'client'
          });

        if (memberError) {
          console.error('Error adding project member:', memberError);
        }
      } else if (invitation.role === 'project_admin' || invitation.role === 'team_member') {
        // Add to project team for admins and team members
        const { error: teamError } = await serviceSupabase
          .from('aloa_project_team')
          .insert({
            project_id: invitation.project_id,
            user_id: newUser.user.id,
            role: invitation.role
          });

        if (teamError) {
          console.error('Error adding to project team:', teamError);
        }
      }

      // Log in timeline
      await serviceSupabase
        .from('aloa_project_timeline')
        .insert({
          project_id: invitation.project_id,
          event_type: 'user_joined',
          description: `${full_name} joined the project as ${invitation.role}`,
          created_by: newUser.user.id,
          metadata: { 
            user_id: newUser.user.id,
            role: invitation.role,
            via_invitation: true
          }
        });
    }

    // Mark invitation as accepted
    const { error: updateError } = await serviceSupabase
      .from('user_invitations')
      .update({ 
        accepted_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the operation
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Please sign in with your credentials.',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Accept invitation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}