import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Sign out the user
    await supabase.auth.signOut();

    // Clear all auth-related cookies
    const response = NextResponse.json({ success: true });

    // Clear Supabase auth cookies
    response.cookies.set('sb-access-token', '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    response.cookies.set('sb-refresh-token', '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // Clear any other auth-related cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    allCookies.forEach(cookie => {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        response.cookies.set(cookie.name, '', {
          path: '/',
          maxAge: 0
        });
      }
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to logout'
    }, {
      status: 500
    });
  }
}