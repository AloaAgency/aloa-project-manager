import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password required' 
      }, { status: 400 });
    }
    
    const cookieStore = cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    // Log what we're using (without exposing full credentials)
    const debugInfo = {
      url: url ? url.substring(0, 30) + '...' : 'missing',
      keyType: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ANON_KEY' : 'PUBLISHABLE_KEY',
      keyPrefix: key ? key.substring(0, 20) + '...' : 'missing',
      keyLength: key?.length || 0
    };
    
    console.log('Test login attempt with:', debugInfo);
    
    const supabase = createServerClient(
      url,
      key,
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
              path: '/'
            });
          },
          remove(name, options) {
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
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name
      });
      
      return NextResponse.json({
        error: error.message,
        errorDetails: {
          status: error.status,
          code: error.code,
          name: error.name
        },
        debugInfo
      });
    }
    
    return NextResponse.json({
      success: true,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userEmail: data?.user?.email,
      debugInfo
    });
    
  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      error: error.message,
      serverError: true
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test login endpoint - use POST with { email, password }'
  });
}