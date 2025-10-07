import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
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
 * Verify OTP and log user in
 * POST /api/auth/verify-otp
 * Body: { email: string, token: string, type: 'magiclink' }
 */
export async function POST(request) {
  try {
    const { email, token, type = 'magiclink' } = await request.json();

    const rawEmail = typeof email === 'string' ? email.trim() : '';

    if (!rawEmail || !token) {
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

    const normalizedEmail = rawEmail.toLowerCase();
    const clientIp = getClientIp(request);

    const rateLimitResult = enforceVerificationRateLimits(normalizedEmail, clientIp);
    if (!rateLimitResult.allowed) {
      console.warn('[otp:verify] rate-limit-hit', {
        email: normalizedEmail,
        ip: clientIp,
        status: rateLimitResult.status,
        retryAfter: rateLimitResult.retryAfter,
        type
      });
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
      console.warn('[otp:verify] lockout-active', {
        email: normalizedEmail,
        ip: clientIp,
        retryAfter: lockState.retryAfter,
        type
      });
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
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: rawEmail,
      token,
      type: 'magiclink'
    });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      const failureState = registerVerificationFailure(normalizedEmail);

      if (failureState.locked) {
        console.warn('[otp:verify] lockout-triggered', {
          email: normalizedEmail,
          ip: clientIp,
          retryAfter: failureState.retryAfter,
          type
        });
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

      console.warn('[otp:verify] invalid-token', {
        email: normalizedEmail,
        ip: clientIp,
        type
      });
      return NextResponse.json(
        {
          error: 'Invalid or expired verification code'
        },
        { status: 400 }
      );
    }

    clearVerificationFailures(normalizedEmail);

    let authUserId = verifyData?.user?.id || null;

    if (!authUserId) {
      console.error('[otp:verify] No user ID from OTP verification', {
        email: rawEmail
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: userProfile, error: userError } = await supabase
      .from('aloa_user_profiles')
      .select('id, email, role')
      .eq('id', authUserId)
      .single();

    if (userError || !userProfile) {
      console.error('[otp:verify] User profile not found for auth user', {
        email: rawEmail,
        authUserId,
        error: userError
      });
      return NextResponse.json(
        { error: 'User profile not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Set the session cookies using SSR client
    const cookieStore = cookies();

    if (verifyData?.session) {
      // Create a server client that will set the cookies properly
      const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
              const isProduction = process.env.NODE_ENV === 'production';
              cookieStore.set({
                name,
                value,
                ...options,
                sameSite: 'lax',
                secure: isProduction,
                httpOnly: true,
                path: '/',
              });
            },
            remove(name, options) {
              cookieStore.set({
                name,
                value: '',
                ...options,
                maxAge: 0,
                path: '/',
              });
            },
          },
        }
      );

      // Set the session on the server client
      await serverSupabase.auth.setSession({
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token
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
      },
      session: verifyData?.session || null
    });

  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
