import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['super_admin', 'project_admin', 'team_member', 'client', 'client_admin', 'client_participant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update user role
    const { data, error } = await supabase
      .from('aloa_user_profiles')
      .update({ role: role, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${email} role to ${role}`,
      profile: data
    });

  } catch (error) {

    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}