import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize admin Supabase client with service role key
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!resend) {
      console.error('Resend not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Generate a magic link using Supabase Admin API
    // This bypasses rate limits by using the admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/auth/update-password`
      }
    });

    if (error) {
      console.error('Error generating recovery link:', error);
      // Don't reveal if user exists or not
      return NextResponse.json({ 
        success: true, 
        message: 'If an account exists with this email, a reset link has been sent.' 
      });
    }

    if (!data?.properties?.action_link) {
      console.error('No action link generated');
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
    }

    // Extract the reset URL
    const resetUrl = data.properties.action_link;

    // Send email using Resend with your custom domain
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>You requested to reset your password for your Aloa account. Click the button below to set a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email. Your password won't be changed.</p>
            <div class="footer">
              <p>Best regards,<br>The Aloa Team</p>
              <p>© ${new Date().getFullYear()} Aloa Agency. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Aloa <noreply@updates.aloa.agency>',
      to: email,
      subject: 'Reset Your Password',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists with this email, a reset link has been sent.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}