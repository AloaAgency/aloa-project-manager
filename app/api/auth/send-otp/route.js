import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Basic in-memory rate limiting to slow abuse. For production hardening,
// back this with Redis or another shared store so limits persist across instances.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_RATE_LIMIT = 3; // max requests per email window
const IP_RATE_LIMIT = 10; // max requests per IP window
const emailRequestState = new Map();
const ipRequestState = new Map();

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

function applySlidingWindowLimit(store, key, limit, windowMs) {
  if (!key) {
    return { limited: false, retryAfter: 0 };
  }

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return {
      limited: true,
      retryAfter: Math.ceil((existing.reset - now) / 1000)
    };
  }

  existing.count += 1;
  return {
    limited: false,
    retryAfter: Math.max(0, Math.ceil((existing.reset - now) / 1000))
  };
}

/**
 * Send OTP via Supabase Auth
 * POST /api/auth/send-otp
 * Body: { email: string, type: 'recovery' | 'magiclink' }
 */
export async function POST(request) {
  try {
    const { email, type = 'recovery' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const clientIp = getClientIp(request);

    // Apply rate limits before hitting Supabase to short-circuit abusive traffic
    const ipLimit = applySlidingWindowLimit(ipRequestState, clientIp, IP_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    if (ipLimit.limited) {
      return NextResponse.json(
        {
          error: 'Too many OTP requests from this IP. Please wait before trying again.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipLimit.retryAfter)
          }
        }
      );
    }

    const emailLimit = applySlidingWindowLimit(emailRequestState, normalizedEmail, EMAIL_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    if (emailLimit.limited) {
      return NextResponse.json(
        {
          error: 'Too many OTP requests for this email. Please wait before requesting another code.'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(emailLimit.retryAfter)
          }
        }
      );
    }

    // For recovery type, check if user exists
    if (type === 'recovery') {
      const { data: user, error: userError } = await supabase
        .from('aloa_user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'No account found with this email address' },
          { status: 404 }
        );
      }
    }

    // For magiclink type, check if user exists
    if (type === 'magiclink') {
      const { data: user, error: userError } = await supabase
        .from('aloa_user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'No account found with this email address' },
          { status: 404 }
        );
      }
    }

    // Use Supabase's built-in OTP functionality
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false // Don't create new users via OTP
      }
    });

    if (error) {
      console.error('Supabase OTP error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 900 // 15 minutes in seconds
    });

  } catch (error) {
    console.error('Error in send-otp:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
