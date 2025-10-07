import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

/**
 * Verify OTP and log user in
 * POST /api/auth/verify-otp
 * Body: { email: string, token: string, type: 'magiclink' }
 */
export async function POST(request) {
  try {
    const { email, token, type = 'magiclink' } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    if (token.length !== 6 || !/^\d+$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // First, verify the OTP using Supabase's verifyOtp
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink'
    });

    if (verifyError) {
      // Fallback: Check our custom table
      const { data: storedToken, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', token)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tokenError || !storedToken) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 400 }
        );
      }

      // Delete used token
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('id', storedToken.id);
    } else {
      // Supabase verification succeeded, clean up our backup token
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('email', email)
        .eq('token', token);
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('aloa_user_profiles')
      .select('id, auth_user_id, email, role')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create a session using Supabase Auth
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email
    });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      // Continue anyway - we'll set cookies manually
    }

    // Set session cookies
    const cookieStore = cookies();

    if (verifyData?.session) {
      // Set access token
      cookieStore.set('sb-access-token', verifyData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      // Set refresh token
      cookieStore.set('sb-refresh-token', verifyData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }

    // Set user ID cookie for client-side access
    cookieStore.set('user-id', userProfile.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    // Determine redirect based on role
    let redirectTo = '/dashboard';

    if (['client', 'client_admin', 'client_participant'].includes(userProfile.role)) {
      // Get user's project
      const { data: projectMember } = await supabase
        .from('aloa_project_members')
        .select('project_id')
        .eq('user_id', userProfile.id)
        .eq('project_role', 'viewer')
        .single();

      if (projectMember) {
        redirectTo = `/project/${projectMember.project_id}/dashboard`;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      redirectTo,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role
      }
    });

  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
