import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();

    // Log environment variables (safely)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 });
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name);

            return cookie?.value;
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

    // Try to get user

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {

      return NextResponse.json({
        authenticated: false,
        error: error.message,
        cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      });
    }

    if (!user) {

      return NextResponse.json({
        authenticated: false,
        message: 'No user session found',
        cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    });

  } catch (error) {

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}