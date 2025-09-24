import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!serviceKey) {
      return NextResponse.json({ error: 'No service key available' }, { status: 500 });
    }

    // Create service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {

      return NextResponse.json({ error: 'Failed to list buckets', details: listError }, { status: 500 });
    }

    // Check if avatars bucket exists
    const avatarsBucket = buckets?.find(b => b.id === 'avatars' || b.name === 'avatars');

    if (!avatarsBucket) {
      // Create the avatars bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      });

      if (createError) {

        return NextResponse.json({
          error: 'Failed to create bucket',
          details: createError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Avatars bucket created successfully',
        bucket: createData
      });
    }

    return NextResponse.json({
      message: 'Avatars bucket already exists',
      bucket: avatarsBucket
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}