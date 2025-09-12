import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    
    // Log environment info for debugging
    const envInfo = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    };
    
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            const value = cookieStore.get(name)?.value;
            console.log(`Getting cookie ${name}:`, value ? 'exists' : 'missing');
            return value;
          },
          set(name, value, options) {
            console.log(`Setting cookie ${name} with options:`, options);
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
            console.log(`Removing cookie ${name}`);
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

    // Check if user is authenticated
    const { data: { user }, error } = await supabase.auth.getUser();

    // Get all cookies (without exposing values for security)
    const allCookies = cookieStore.getAll().map(cookie => ({
      name: cookie.name,
      hasValue: !!cookie.value,
      // Check for Supabase auth cookies specifically
      isSupabaseCookie: cookie.name.includes('supabase') || cookie.name.includes('sb-')
    }));

    const supabaseCookies = allCookies.filter(c => c.isSupabaseCookie);

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        error: error?.message || 'Auth session missing!',
        environment: envInfo,
        cookies: allCookies,
        supabaseCookies: supabaseCookies,
        cookieCount: allCookies.length,
        supabaseCookieCount: supabaseCookies.length
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      environment: envInfo,
      cookies: allCookies,
      supabaseCookies: supabaseCookies
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error.message,
      serverError: true,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}