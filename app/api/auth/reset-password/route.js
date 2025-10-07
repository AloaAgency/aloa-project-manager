import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

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

    // Use the standard Supabase password reset flow
    // This respects the redirect URLs configured in your Supabase dashboard
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/update-password`,
    });

    if (error) {
      console.error('[ResetPassword] Error:', error);
      // Don't reveal specific errors to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });

  } catch (error) {
    console.error('[ResetPassword] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}