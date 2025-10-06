import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

// Handle CORS preflight requests
export async function OPTIONS(request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  });

  return new NextResponse(null, { status: 200, headers });
}

export async function GET(request) {
  try {
    // Add CORS headers for client-side requests
    const headers = new Headers({
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Create server-side Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // Ensure proper cookie settings for production
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/'
            });
          },
          remove(name, options) {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              maxAge: 0,
              path: '/'
            });
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers }
      );
    }

    // Try to get user profile
    // Use service role to bypass RLS issues
    let profile = null;
    let profileError = null;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (serviceKey) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey
      );

      // First try by email (more reliable for super_admin)
      const { data: profileByEmail, error: emailError } = await serviceSupabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileByEmail) {
        profile = profileByEmail;

      } else {
        // Fallback to ID if email not found
        const { data: profileById, error: idError } = await serviceSupabase
          .from('aloa_user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        profile = profileById;
        profileError = idError;
        if (profile) {

        }
      }
    } else {
      // Fallback to regular client if no service key
      const { data, error } = await supabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      profile = data;
      profileError = error;
    }

    if (profileError) {

      // If profile doesn't exist, return user data with default role
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            role: 'client' // Default role
          }
        }, { headers });
      }

      return NextResponse.json(
        { error: 'Failed to fetch profile: ' + profileError.message },
        { status: 500, headers }
      );
    }

    let clientProject = null;
    let clientProjects = [];
    const userRole = profile?.role || 'client';
    const clientRoles = ['client', 'client_admin', 'client_participant'];

    if (clientRoles.includes(userRole) && serviceKey) {
      try {
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceKey
        );

        const { data: memberData } = await serviceSupabase
          .from('aloa_project_members')
          .select(`
            project_id,
            project_role,
            aloa_projects!inner (
              id,
              project_name,
              status
            )
          `)
          .eq('user_id', user.id);

        if (Array.isArray(memberData) && memberData.length > 0) {
          clientProjects = memberData
            .filter(record => record?.aloa_projects)
            .map(record => ({
              ...record.aloa_projects,
              project_role: record.project_role,
            }));

          if (clientProjects.length > 0) {
            clientProject = clientProjects[0];
          }
        }
      } catch (projectError) {
        console.warn('[Profile API] Unable to load client project', projectError.message);
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        profile: profile
      },
      clientProject,
      clientProjects
    }, { headers });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}
