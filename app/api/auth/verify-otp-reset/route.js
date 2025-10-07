import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

/**
 * Verify OTP and reset password
 * POST /api/auth/verify-otp-reset
 * Body: { email: string, token: string, newPassword: string, type: 'recovery' | 'magiclink' }
 */
export async function POST(request) {
  try {
    const { email, token, newPassword, type = 'recovery' } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Email, token, and new password are required' },
        { status: 400 }
      );
    }

    if (token.length !== 6 || !/^\d+$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // First, verify the OTP using Supabase's verifyOtp
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type === 'recovery' ? 'email' : 'magiclink'
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

    // Get user by email
    const { data: userProfile, error: userError } = await supabase
      .from('aloa_user_profiles')
      .select('id, auth_user_id')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update password using Supabase Admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userProfile.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Log the password reset
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: null,
        event_type: 'password_reset',
        event_title: 'Password Reset',
        description: `Password reset successfully for ${email}`,
        triggered_by: userProfile.id,
        created_at: new Date().toISOString()
      })
      .catch(err => console.error('Error logging password reset:', err));

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error in verify-otp-reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
