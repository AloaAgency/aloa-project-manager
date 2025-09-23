import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

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

    // First verify we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {

      return NextResponse.json(
        { error: 'Invalid session. Please request a new password reset.' },
        { status: 401 }
      );
    }

    // Update the user's password
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Sign out the user to clear the recovery session
    await supabase.auth.signOut();

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}