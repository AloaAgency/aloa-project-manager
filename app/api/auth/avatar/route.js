import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Create server-side Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/'
            });
          },
          remove(name, options) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/'
            });
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create file name with user ID and timestamp to ensure uniqueness
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use service role client for storage operations to bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey
    );

    // Delete old avatar if exists
    const { data: profile } = await serviceSupabase
      .from('aloa_user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (profile?.avatar_url) {
      // Extract the file path from the URL
      const oldFilePath = profile.avatar_url.split('/').slice(-2).join('/');
      if (oldFilePath.startsWith('avatars/')) {
        await serviceSupabase.storage.from('avatars').remove([oldFilePath.replace('avatars/', '')]);
      }
    }

    // Upload new avatar using service role client

    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {

      return NextResponse.json(
        { error: `Failed to upload avatar: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = serviceSupabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new avatar URL (using the service client we already have)

    const { data: updatedData, error: updateError } = await serviceSupabase
      .from('aloa_user_profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {

      // Try to delete the uploaded file since profile update failed
      await serviceSupabase.storage.from('avatars').remove([fileName]);

      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      avatar_url: publicUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Create server-side Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              path: '/'
            });
          },
          remove(name, options) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/'
            });
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current avatar URL
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (profile?.avatar_url) {
      // Extract the file path from the URL
      const filePath = profile.avatar_url.split('/').slice(-2).join('/');
      if (filePath.startsWith('avatars/')) {
        await supabase.storage.from('avatars').remove([filePath.replace('avatars/', '')]);
      }
    }

    // Clear avatar URL in profile
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (serviceKey) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey
      );

      await serviceSupabase
        .from('aloa_user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } else {
      await supabase
        .from('aloa_user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    return NextResponse.json({
      message: 'Avatar removed successfully'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}