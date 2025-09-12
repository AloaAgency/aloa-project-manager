import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    
    // Log environment variables (safely)
    console.log('Test auth endpoint - Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyUsed: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ANON_KEY' : 'PUBLISHABLE_KEY'
    });

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
            console.log(`Getting cookie ${name}:`, cookie ? 'found' : 'not found');
            return cookie?.value;
          },
          set(name, value, options) {
            console.log(`Setting cookie ${name}`);
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            console.log(`Removing cookie ${name}`);
            cookieStore.set({ name, value: '', ...options });
          }
        }
      }
    );

    // Try to get user
    console.log('Attempting to get user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('Error getting user:', error);
      return NextResponse.json({
        authenticated: false,
        error: error.message,
        cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      });
    }

    if (!user) {
      console.log('No user found');
      return NextResponse.json({
        authenticated: false,
        message: 'No user session found',
        cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      });
    }

    console.log('User found:', user.email);
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    });

  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}