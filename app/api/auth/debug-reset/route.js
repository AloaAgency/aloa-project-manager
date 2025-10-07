import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint debugs the reset password flow
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('[DebugReset] Starting debug for:', email);

    // Try with admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Try with regular client
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      }
    );

    const results = {};

    // Test 1: Generate admin link
    console.log('[DebugReset] Test 1: Admin generateLink');
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `http://localhost:3001/auth/update-password`
        }
      });

      if (error) {
        results.adminLink = { error: error.message };
      } else {
        results.adminLink = {
          success: true,
          actionLink: data.properties?.action_link?.substring(0, 100) + '...',
          fullLink: data.properties?.action_link
        };
      }
    } catch (err) {
      results.adminLink = { exception: err.message };
    }

    // Test 2: Regular reset password
    console.log('[DebugReset] Test 2: Regular resetPasswordForEmail');
    try {
      const { data, error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
        redirectTo: `http://localhost:3001/auth/update-password`
      });

      if (error) {
        results.regularReset = { error: error.message };
      } else {
        results.regularReset = { success: true };
      }
    } catch (err) {
      results.regularReset = { exception: err.message };
    }

    // Test 3: Check if user exists
    console.log('[DebugReset] Test 3: Check user exists');
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      if (!error && data?.users) {
        const userExists = data.users.some(u => u.email === email);
        results.userExists = userExists;
      }
    } catch (err) {
      results.userExists = { exception: err.message };
    }

    console.log('[DebugReset] Results:', results);

    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      email,
      results,
      environment: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        nodeEnv: process.env.NODE_ENV,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_SECRET_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      }
    });

  } catch (error) {
    console.error('[DebugReset] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}