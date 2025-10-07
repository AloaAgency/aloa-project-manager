import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Simple password reset that stores tokens in database instead of using Supabase's flow
export async function POST(request) {
  try {
    const { email, token, newPassword } = await request.json();

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

    // Step 1: Send reset email with custom token
    if (email && !token && !newPassword) {
      // Generate a random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database (you'll need to create this table)
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (insertError) {
        console.log('[SimpleReset] Table might not exist, attempting to create...');

        // Create table using raw SQL
        try {
          const { error: createError } = await supabaseAdmin.from('password_reset_tokens').select('count').limit(1);

          if (createError && createError.code === '42P01') {
            // Table doesn't exist - for now, just return error
            return NextResponse.json({
              error: 'Password reset tokens table needs to be created in Supabase',
              instructions: 'Run this SQL in Supabase SQL editor: CREATE TABLE password_reset_tokens (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());'
            }, { status: 500 });
          }
        } catch (err) {
          console.error('[SimpleReset] Table check error:', err);
        }

        return NextResponse.json({ error: 'Failed to store reset token' }, { status: 500 });
      }

      // Return the reset URL (in production, send this via email)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/simple-reset?token=${resetToken}`;

      return NextResponse.json({
        success: true,
        message: 'Reset link generated',
        resetUrl, // Only for testing - remove in production
        expiresAt
      });
    }

    // Step 2: Verify token and reset password
    if (token && newPassword) {
      // Check if token is valid
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }

      // Get user by email
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      if (usersError) {
        return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
      }

      const user = users.find(u => u.email === tokenData.email);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }

      // Mark token as used
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('[SimpleReset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}