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

    // Get the user's profile from aloa_user_profiles table
    const { data: aloaProfile, error: aloaProfileError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Also check by email as a fallback
    let aloaProfileByEmail = null;
    if (user.email) {
      const { data: emailProfile } = await supabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      aloaProfileByEmail = emailProfile;
    }
    
    // Also check old profiles table for comparison
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      aloaProfile: aloaProfile || null,
      aloaProfileByEmail: aloaProfileByEmail || null,
      aloaProfileError: aloaProfileError?.message || null,
      oldProfile: oldProfile || null,
      hasRole: aloaProfile?.role ? true : false,
      role: aloaProfile?.role || aloaProfileByEmail?.role || 'NOT SET',
      isSuperAdmin: (aloaProfile?.role === 'super_admin' || aloaProfileByEmail?.role === 'super_admin')
    });

  } catch (error) {
    console.error('Check role error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}