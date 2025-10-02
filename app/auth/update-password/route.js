import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code') || requestUrl.searchParams.get('token_hash');
  const error = requestUrl.searchParams.get('error');
  const errorCode = requestUrl.searchParams.get('error_code');

  if (error || errorCode === 'otp_expired') {
    return NextResponse.redirect(
      new URL(`/auth/reset-password?error=${encodeURIComponent(error || 'Link expired')}`, requestUrl.origin)
    );
  }

  if (code) {
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

    try {
      // Exchange the code for a session
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError && sessionData?.session) {
        // Verify the session is actually set
        const { data: { session: verifySession } } = await supabase.auth.getSession();

        // Redirect to the password update page with session established
        return NextResponse.redirect(new URL('/auth/update-password/form', requestUrl.origin));
      } else {

        return NextResponse.redirect(
          new URL('/auth/reset-password?error=Invalid or expired link. Please request a new one.', requestUrl.origin)
        );
      }
    } catch (err) {

      return NextResponse.redirect(
        new URL('/auth/reset-password?error=An error occurred', requestUrl.origin)
      );
    }
  }

  // If no code, redirect to reset password page
  return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
}
