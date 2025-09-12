import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'ross@aloa.agency';
    
    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check in aloa_user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Check project memberships
    let projects = null;
    if (profile) {
      const { data: projectData } = await supabase
        .from('aloa_project_members')
        .select(`
          *,
          aloa_projects (
            id,
            project_name,
            status
          )
        `)
        .eq('user_id', profile.id);
      
      projects = projectData;
    }

    return NextResponse.json({
      email: email,
      profile: profile,
      profileError: profileError?.message,
      projects: projects,
      role: profile?.role || 'Not found',
      isAdmin: profile?.role === 'super_admin' || profile?.role === 'project_admin',
      debug: {
        hasProfile: !!profile,
        profileRole: profile?.role,
        profileId: profile?.id
      }
    });

  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json({
      error: 'Failed to check user',
      details: error.message
    }, { status: 500 });
  }
}