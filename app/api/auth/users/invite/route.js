import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Send invitation email
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const { email, full_name, role = 'client', project_id, custom_message } = body;

    // Validate required fields
    if (!email || !full_name) {
      return NextResponse.json({ 
        error: 'Email and full name are required' 
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

    // Check if requester is authenticated and authorized
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const isAuthorized = profile?.role === 'super_admin' || 
                        (profile?.role === 'project_admin' && role === 'client' && project_id);

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Forbidden - You do not have permission to send invitations' 
      }, { status: 403 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('aloa_user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 400 });
    }

    // Generate a secure invitation token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Use createClient directly with service role to bypass RLS
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );

    // Store the invitation in database using service role client
    console.log('Creating invitation with:', {
      email,
      full_name,
      role,
      project_id: project_id || null,
      hasProjectId: !!project_id
    });
    
    const { error: inviteError } = await serviceSupabase
      .from('user_invitations')
      .insert({
        email,
        full_name,
        role,
        project_id: project_id || null, // Convert empty string to null
        token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        custom_message
      });

    if (inviteError) {
      console.error('Error storing invitation:', inviteError);
      
      // Check if table doesn't exist
      if (inviteError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Invitation system not initialized. Please run the user_invitations_table.sql migration in Supabase.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create invitation: ' + inviteError.message 
      }, { status: 500 });
    }

    // Get project name if applicable
    let projectName = null;
    if (project_id) {
      const { data: project } = await supabase
        .from('aloa_projects')
        .select('name')
        .eq('id', project_id)
        .single();
      projectName = project?.name;
    }

    // Prepare the invitation URL
    // Use production URL if set, otherwise fall back to request headers
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      // Try to get the production URL from Vercel environment
      if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('vercel.app')) {
        // Use VERCEL_URL only if it's a custom domain
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Fall back to the request headers to get the actual domain
        const headers = request.headers;
        const host = headers.get('host');
        const protocol = headers.get('x-forwarded-proto') || 'https';
        
        // Avoid using Vercel preview URLs
        if (host && !host.includes('vercel.app')) {
          baseUrl = `${protocol}://${host}`;
        } else {
          // Last resort: use a hardcoded production URL
          // TODO: Update this with your actual production domain
          baseUrl = 'https://aloa-project-manager.vercel.app';
        }
      }
    }
    
    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${inviteToken}`;
    console.log('Generated invitation URL:', inviteUrl);

    // Send invitation email
    let emailSent = false;
    let emailError = null;
    
    if (process.env.RESEND_API_KEY) {
      try {
        console.log('Attempting to send invitation email to:', email);
        const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', // Use verified domain or default
          to: email,
          subject: `Invitation to join Aloa Project Manager${projectName ? ` - ${projectName}` : ''}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #111; margin-bottom: 20px;">You're Invited to Aloa Project Manager</h2>
              
              <p style="color: #333; line-height: 1.6;">
                Hi ${full_name},
              </p>
              
              <p style="color: #333; line-height: 1.6;">
                ${profile?.full_name || user.email} has invited you to join the Aloa Project Management system 
                as a <strong>${roleDisplay}</strong>${projectName ? ` for the project "${projectName}"` : ''}.
              </p>
              
              ${custom_message ? `
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #666; margin: 0; font-style: italic;">"${custom_message}"</p>
                </div>
              ` : ''}
              
              <div style="margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                This invitation will expire in 7 days. If you have any questions, please contact your project administrator.
              </p>
              
              <p style="color: #999; line-height: 1.6; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                If you didn't expect this invitation, you can safely ignore this email.
                <br>
                Or copy and paste this link: ${inviteUrl}
              </p>
            </div>
          `
        });
        
        console.log('Email sent successfully:', emailResult);
        emailSent = true;
      } catch (error) {
        console.error('Error sending invitation email:', error);
        emailError = error.message;
        // Don't fail the whole operation if email fails
        // The invitation is still stored and can be retrieved
      }
    } else {
      console.log('RESEND_API_KEY not configured - skipping email');
    }

    return NextResponse.json({ 
      success: true,
      emailSent,
      emailError,
      invitation: {
        email,
        full_name,
        role,
        project_id,
        expires_at: expiresAt.toISOString(),
        invite_url: inviteUrl
      }
    });

  } catch (error) {
    console.error('Invite user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List pending invitations (super admin only)
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    
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

    // Check if user is authenticated and is super admin
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
      return NextResponse.json({ 
        error: 'Forbidden - Super admin access required' 
      }, { status: 403 });
    }

    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        full_name,
        role,
        project_id,
        expires_at,
        created_at,
        accepted_at,
        invited_by,
        aloa_projects(name),
        aloa_user_profiles!invited_by(full_name, email)
      `)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitationsError) {
      // Table might not exist yet
      if (invitationsError.code === '42P01') {
        return NextResponse.json({ invitations: [] });
      }
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations: invitations || [] });

  } catch (error) {
    console.error('Get invitations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel invitation (super admin only)
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get('invitation_id');

    if (!invitation_id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
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

    // Check if user is authenticated and is super admin
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
      return NextResponse.json({ 
        error: 'Forbidden - Super admin access required' 
      }, { status: 403 });
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('user_invitations')
      .delete()
      .eq('id', invitation_id);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Cancel invitation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}