import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create custom fetch with longer timeout
    const customFetch = (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
    };

    // Create server-side Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: customFetch,
        },
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // Ensure proper cookie settings for production
            // For localhost development, use more permissive settings
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieOptions = {
              name,
              value,
              ...options,
              sameSite: isProduction ? 'lax' : 'lax', // Keep lax for localhost
              secure: isProduction,
              httpOnly: true,
              path: '/',
              domain: undefined // Let browser handle domain
            };
            cookieStore.set(cookieOptions);
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

    // Sign out any existing session first to ensure clean state
    await supabase.auth.signOut();

    // Small delay to ensure cookies are cleared
    await new Promise(resolve => setTimeout(resolve, 200));

    // Attempt to sign in with fresh session
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // If successful, verify the session was established
    if (!error && data?.session) {
      // Wait a moment for session to establish
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify session is accessible
      const { data: { session: verifiedSession } } = await supabase.auth.getSession();
      if (!verifiedSession) {

        // Sometimes in private tabs the first attempt doesn't stick
        // Force refresh the session
        await supabase.auth.refreshSession();
      }
    }

    if (error) {

      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data?.user || !data?.session) {

      return NextResponse.json(
        { error: 'Login failed - please try again' },
        { status: 401 }
      );
    }

    // Get user profile with role information
    // Use service role to bypass RLS issues
    let profile = null;
    let profileError = null;
    let serviceSupabase = null;

    // Try with service role key if available
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (serviceKey) {
      serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey
      );

      // First try by email (more reliable for super_admin)
      const { data: profileByEmail, error: emailError } = await serviceSupabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (profileByEmail) {
        profile = profileByEmail;
      } else {
        // Fallback to ID if email not found
        const { data: profileById, error: idError } = await serviceSupabase
          .from('aloa_user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        profile = profileById;
        profileError = idError;
      }
    } else {
      // Fallback to regular client if no service key
      const { data: profileData, error: err } = await supabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      profile = profileData;
      profileError = err;
    }

    if (profileError) {

    }

    const userRole = profile?.role || 'client';

    // If user is any type of client role, get their project
    let clientProject = null;
    const clientRoles = ['client', 'client_admin', 'client_participant'];
    if (clientRoles.includes(userRole)) {

      // Use service role to bypass RLS - must be available if we're here
      if (!serviceSupabase) {

      } else {
        const { data: memberData, error: memberError } = await serviceSupabase
          .from('aloa_project_members')
          .select(`
            project_id,
            project_role,
            aloa_projects (
              id,
              project_name,
              status
            )
          `)
          .eq('user_id', data.user.id)
          .eq('project_role', 'viewer')
          .single();

        if (memberError) {

        } else if (memberData?.aloa_projects) {
          clientProject = memberData.aloa_projects;

        } else {

        }
      }
    }

    // Small delay to ensure session is fully established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create response with explicit headers
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
        profile: profile
      },
      session: data.session, // Include session for client-side handling
      clientProject: clientProject
    });

    // Set cache control headers to prevent caching of auth responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}