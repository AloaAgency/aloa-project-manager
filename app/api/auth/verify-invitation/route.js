import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required' 
      }, { status: 400 });
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    const serviceSupabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invitation details
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('user_invitations')
      .select(`
        id,
        email,
        full_name,
        role,
        project_id,
        expires_at,
        accepted_at,
        aloa_projects(project_name)
      `)
      .eq('token', token)
      .single();

    if (inviteError) {

      return NextResponse.json({ 
        error: 'Database error: ' + inviteError.message,
        valid: false 
      }, { status: 500 });
    }

    if (!invitation) {

      return NextResponse.json({ 
        error: 'Invalid or expired invitation',
        valid: false 
      }, { status: 404 });
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json({ 
        error: 'This invitation has already been accepted',
        valid: false
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This invitation has expired',
        valid: false
      }, { status: 400 });
    }

    return NextResponse.json({ 
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        project_id: invitation.project_id,
        expires_at: invitation.expires_at,
        project: invitation.aloa_projects ? {
          name: invitation.aloa_projects.project_name
        } : null
      }
    });

  } catch (error) {

    return NextResponse.json({ 
      error: 'Internal server error',
      valid: false 
    }, { status: 500 });
  }
}