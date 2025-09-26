import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  try {
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
            cookieStore.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/',
            });
          },
          remove(name, options) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/',
            });
          },
        },
      }
    );

    // Sign out the user
    await supabase.auth.signOut();

    // Clear all auth-related cookies
    const response = NextResponse.json({ success: true });

    const clearCookie = (name) => {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
      });
    };

    // Clear Supabase auth cookies
    clearCookie('sb-access-token');
    clearCookie('sb-refresh-token');

    // Clear any other auth-related cookies
    const allCookies = cookieStore.getAll();

    allCookies.forEach((cookie) => {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        clearCookie(cookie.name);
      }
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'Failed to logout'
    }, {
      status: 500
    });
  }
}
