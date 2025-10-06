import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/auth/login?authenticated=true';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[AuthCallbackRoute] Processing callback:', {
    hasCode: !!code,
    error,
    errorDescription,
    next
  });

  if (error) {
    console.error('[AuthCallbackRoute] Error from Supabase:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
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
          },
        },
      }
    );

    try {
      console.log('[AuthCallbackRoute] Exchanging code for session');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[AuthCallbackRoute] Exchange failed:', exchangeError);
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
      }

      console.log('[AuthCallbackRoute] Session established, redirecting to:', next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      console.error('[AuthCallbackRoute] Unexpected error:', err);
      return NextResponse.redirect(
        new URL(`/auth/login?error=Authentication failed`, requestUrl.origin)
      );
    }
  }

  // No code or error - might be a hash-based flow, redirect to client-side handler
  console.log('[AuthCallbackRoute] No code parameter, redirecting to client page');
  return NextResponse.redirect(new URL('/auth/callback-client' + requestUrl.search, requestUrl.origin));
}
