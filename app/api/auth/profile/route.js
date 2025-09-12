import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';import { createServerClient } from '@supabase/ssr';
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
        { status: 401 }
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
        console.log('Profile found by email:', user.email, 'role:', profileByEmail.role);
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
          console.log('Profile found by ID:', user.id, 'role:', profile.role);
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