import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

/**
 * Generate a 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    // For recovery type, check if user exists
    if (type === 'recovery') {
      const { data: user, error: userError } = await supabase
        .from('aloa_user_profiles')
        .select('id')
        .eq('email', email)
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
        .eq('email', email)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'No account found with this email address' },
          { status: 404 }
        );
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Use Supabase's built-in OTP functionality
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // Don't create new users via OTP
        data: {
          otp_code: otp,
          otp_type: type
        }
      }
    });

    if (error) {
      console.error('Supabase OTP error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // Store OTP in custom table for additional verification
    // This provides backup verification if Supabase's OTP system has issues
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: dbError } = await supabase
      .from('password_reset_tokens')
      .insert({
        email: email,
        token: otp,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error storing OTP in database:', dbError);
      // Continue anyway since Supabase OTP was sent
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
