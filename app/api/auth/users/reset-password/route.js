import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // First verify the requesting user is a super_admin
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is super_admin
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can reset passwords' }, { status: 403 });
    }

    // Now use admin client to reset the password
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

    // Update the user's password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('[AdminResetPassword] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log(`[AdminResetPassword] Password reset for user ${userId} by admin ${currentUser.id}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('[AdminResetPassword] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}