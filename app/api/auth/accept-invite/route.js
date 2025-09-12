import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Verify the invitation token
    const { data: invitation, error: inviteError } = await supabase
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
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
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
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role: invitation.role,
        metadata: {
          invited_by: invitation.invited_by,
          invitation_accepted_at: new Date().toISOString()
        }
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Try to delete the user if profile creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ 
        error: 'Failed to create user profile' 
      }, { status: 500 });
    }

    // If role is client and project_id exists, add them as stakeholder
    if (invitation.role === 'client' && invitation.project_id) {
      const { error: stakeholderError } = await supabase
        .from('aloa_project_stakeholders')
        .insert({
          project_id: invitation.project_id,
          user_id: newUser.user.id,
          role: 'client',
          added_by: invitation.invited_by
        });

      if (stakeholderError) {
        console.error('Error adding stakeholder:', stakeholderError);
        // Don't fail the whole operation
      }

      // Log in timeline
      await supabase
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
    const { error: updateError } = await supabase
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