import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const debugInfo = {
      authenticated: !!user,
      authError: authError?.message || null,
      userId: user?.id || null,
      userEmail: user?.email || null
    };

    // Try to get user's profile
    let profileData = null;
    let profileError = null;
    
    if (user) {
      const { data, error } = await supabase
        .from('aloa_user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      profileData = data;
      profileError = error;
    }

    // Try to fetch all users
    const { data: allUsers, error: usersError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .limit(10);

    // Check if aloa_user_profiles table exists and has the right columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .limit(1);

    return NextResponse.json({
      debug: debugInfo,
      profile: {
        data: profileData,
        error: profileError?.message || null,
        role: profileData?.role || null
      },
      users: {
        count: allUsers?.length || 0,
        data: allUsers || [],
        error: usersError?.message || null
      },
      tableCheck: {
        hasData: !!tableInfo,
        error: tableError?.message || null,
        sample: tableInfo?.[0] || null
      }
    });

  } catch (error) {
    console.error('Test users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}