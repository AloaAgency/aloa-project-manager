import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorCode = requestUrl.searchParams.get('error_code');
  
  console.log('Password reset callback:', { code: !!code, error, errorCode });
  
  if (error || errorCode === 'otp_expired') {
    return NextResponse.redirect(
      new URL(`/auth/reset-password?error=${encodeURIComponent(error || 'Link expired')}`, requestUrl.origin)
    );
  }
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
      
      console.log('Code exchange result:', { 
        hasSession: !!sessionData?.session,
        hasUser: !!sessionData?.user,
        error: exchangeError 
      });
      
      if (!exchangeError && sessionData?.session) {
        // Verify the session is actually set
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        console.log('Session verification after exchange:', !!verifySession);
        
        // Redirect to the password update page with session established
        return NextResponse.redirect(new URL('/auth/update-password/form', requestUrl.origin));
      } else {
        console.error('Failed to exchange code or no session returned:', exchangeError);
        return NextResponse.redirect(
          new URL('/auth/reset-password?error=Invalid or expired link. Please request a new one.', requestUrl.origin)
        );
      }
    } catch (err) {
      console.error('Error in password reset callback:', err);
      return NextResponse.redirect(
        new URL('/auth/reset-password?error=An error occurred', requestUrl.origin)
      );
    }
  }
  
  // If no code, redirect to reset password page
  return NextResponse.redirect(new URL('/auth/reset-password', requestUrl.origin));
}