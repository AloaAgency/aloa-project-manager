import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('Server-side login attempt for:', email);

    // Create server-side Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          }
        }
      }
    );

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Server-side login result:', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message
    });

    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data?.user || !data?.session) {
      console.error('No user or session returned from login');
      return NextResponse.json(
        { error: 'Login failed - please try again' },
        { status: 401 }
      );
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    const userRole = profile?.role || 'client';
    console.log('User role:', userRole);

    // If user is a client, get their project
    let clientProject = null;
    if (userRole === 'client') {
      const { data: memberData } = await supabase
        .from('aloa_project_members')
        .select(`
          project_id,
          aloa_projects (
            id,
            project_name,
            status
          )
        `)
        .eq('user_id', data.user.id)
        .single();

      if (memberData?.aloa_projects) {
        clientProject = memberData.aloa_projects;
        console.log('Client project found:', clientProject);
      }
    }

    console.log('Login successful for:', email, 'with role:', userRole);

    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
        profile: profile
      },
      clientProject: clientProject
    });

  } catch (error) {
    console.error('Server error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}