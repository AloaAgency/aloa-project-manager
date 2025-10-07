import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  enforceVerificationRateLimits,
  getVerificationLockState,
  registerVerificationFailure,
  clearVerificationFailures,
  buildRetryHeaders
} from '../../_utils/otpGuards';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const candidate = forwarded.split(',')[0]?.trim();
    if (candidate) {
      return candidate;
    }
  }
  return request.headers.get('x-real-ip') || request.ip || undefined;
}

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

    const normalizedEmail = email.toLowerCase();
    const clientIp = getClientIp(request);

    const rateLimitResult = enforceVerificationRateLimits(normalizedEmail, clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        {
          status: rateLimitResult.status,
          headers: buildRetryHeaders(rateLimitResult.retryAfter)
        }
      );
    }

    const lockState = getVerificationLockState(normalizedEmail);
    if (lockState.locked) {
      return NextResponse.json(
        {
          error: 'Too many incorrect verification attempts. Please wait before trying again.'
        },
        {
          status: 423,
          headers: buildRetryHeaders(lockState.retryAfter)
        }
      );
    }

    // First, verify the OTP using Supabase's verifyOtp
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: type === 'recovery' ? 'email' : 'magiclink'
    });

    if (verifyError) {
      console.error('Error verifying OTP for reset:', verifyError);
      const failureState = registerVerificationFailure(normalizedEmail);

      if (failureState.locked) {
        return NextResponse.json(
          {
            error: 'Too many incorrect verification attempts. Please wait before trying again.'
          },
          {
            status: 423,
            headers: buildRetryHeaders(failureState.retryAfter)
          }
        );
      }

      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    clearVerificationFailures(normalizedEmail);

    // Get user by email
    const { data: userProfile, error: userError } = await supabase
      .from('aloa_user_profiles')
      .select('id, auth_user_id')
      .eq('email', normalizedEmail)
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
        description: `Password reset successfully for ${normalizedEmail}`,
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
