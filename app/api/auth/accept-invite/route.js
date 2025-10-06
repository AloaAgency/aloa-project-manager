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

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId;

    if (existingUser) {

      // User already exists, update their password
      const { data: updatedUser, error: updateError } = await serviceSupabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password,
          email_confirm: true,
          user_metadata: {
            full_name
          }
        }
      );

      if (updateError) {

        return NextResponse.json({ 
          error: updateError.message || 'Failed to update account' 
        }, { status: 400 });
      }

      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email since they came from invitation
        user_metadata: {
          full_name
        }
      });

      if (createError) {

        return NextResponse.json({ 
          error: createError.message || 'Failed to create account' 
        }, { status: 400 });
      }

      userId = newUser.user.id;
    }

    // Create or update the profile

    // Check if profile already exists
    const { data: existingProfile } = await serviceSupabase
      .from('aloa_user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await serviceSupabase
        .from('aloa_user_profiles')
        .update({
          email: email,
          full_name,
          role: invitation.role,
          updated_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', userId);

      if (profileError) {

        return NextResponse.json({ 
          error: `Failed to update user profile: ${profileError.message}` 
        }, { status: 500 });
      }
    } else {
      // Create new profile
      const { error: profileError } = await serviceSupabase
        .from('aloa_user_profiles')
        .insert({
          id: userId,
          email: email,
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

        // Only delete user if we just created them
        if (!existingUser) {
          await serviceSupabase.auth.admin.deleteUser(userId);
        }
        return NextResponse.json({ 
          error: `Failed to create user profile: ${profileError.message}` 
        }, { status: 500 });
      }
    }

    // Add project associations based on role
    if (invitation.project_id) {
      const clientRoles = ['client', 'client_admin', 'client_participant'];

      if (clientRoles.includes(invitation.role)) {
        const { data: existingMember } = await serviceSupabase
          .from('aloa_project_members')
          .select('id')
          .eq('project_id', invitation.project_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingMember) {
          await serviceSupabase
            .from('aloa_project_members')
            .insert({
              project_id: invitation.project_id,
              user_id: userId,
              project_role: 'viewer',
              joined_at: new Date().toISOString()
            });
        }
      }

      if (['project_admin', 'team_member', 'client_admin'].includes(invitation.role)) {
        let existingTeamMember = null;

        if (userId) {
          const { data: byUser } = await serviceSupabase
            .from('aloa_project_team')
            .select('id')
            .eq('project_id', invitation.project_id)
            .eq('user_id', userId)
            .maybeSingle();

          existingTeamMember = byUser;
        }

        if (!existingTeamMember) {
          const { data: byEmail } = await serviceSupabase
            .from('aloa_project_team')
            .select('id')
            .eq('project_id', invitation.project_id)
            .eq('email', email)
            .maybeSingle();

          existingTeamMember = byEmail;
        }

        if (!existingTeamMember) {
          const permissions = invitation.role === 'client_admin'
            ? {
                can_fill_forms: true,
                can_approve: true,
                can_edit_project: false
              }
            : {
                can_fill_forms: true,
                can_approve: invitation.role === 'project_admin',
                can_edit_project: invitation.role === 'project_admin'
              };

          await serviceSupabase
            .from('aloa_project_team')
            .insert({
              project_id: invitation.project_id,
              email,
              name: full_name,
              user_id: userId,
              role: invitation.role,
              permissions
            });
        }
      }

      // Log in timeline
      await serviceSupabase
        .from('aloa_project_timeline')
        .insert({
          project_id: invitation.project_id,
          event_type: 'user_joined',
          description: `${full_name} joined the project as ${invitation.role}`,
          created_by: userId,
          metadata: { 
            user_id: userId,
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

      // Don't fail the operation
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Please sign in with your credentials.',
      user: {
        id: userId,
        email: email,
        full_name,
        role: invitation.role
      }
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
