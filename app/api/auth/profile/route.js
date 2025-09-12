import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
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
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Try to get user profile
    // If RLS fails, we'll use service role
    let profile = null;
    let profileError = null;
    
    // First try with regular client
    const { data, error } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    profile = data;
    profileError = error;

    // If we get an RLS error, try with service role
    if (profileError && profileError.message?.includes('infinite recursion')) {
      console.log('RLS error detected, using service role client');
      
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
      if (serviceKey) {
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceKey
        );
        
        const { data: serviceData, error: serviceError } = await serviceSupabase
          .from('aloa_user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!serviceError) {
          profile = serviceData;
          profileError = null;
        }
      }
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      
      // If profile doesn't exist, return user data with default role
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            role: 'client' // Default role
          }
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch profile: ' + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'client',
        profile: profile
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}