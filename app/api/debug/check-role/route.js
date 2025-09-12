import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Create Supabase client with service role to bypass RLS
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

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null,
        profile: null
      });
    }

    // Get the user's profile directly from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Also check by email as a fallback
    let profileByEmail = null;
    if (user.email) {
      const { data: emailProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      profileByEmail = emailProfile;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      profile: profile || null,
      profileByEmail: profileByEmail || null,
      profileError: profileError?.message || null,
      hasRole: profile?.role ? true : false,
      role: profile?.role || 'NOT SET',
      isSuperAdmin: profile?.role === 'super_admin'
    });

  } catch (error) {
    console.error('Check role error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}