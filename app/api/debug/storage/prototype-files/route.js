import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      return NextResponse.json({ error: 'Failed to list buckets', details: error.message }, { status: 500 });
    }

    const bucket = (buckets || []).find(b => b.name === 'prototype-files');
    if (!bucket) {
      return NextResponse.json({ error: 'Bucket prototype-files not found' }, { status: 404 });
    }

    // Return only safe metadata
    const info = {
      name: bucket.name,
      public: !!bucket.public,
      file_size_limit: bucket.file_size_limit ?? null,
      allowed_mime_types: bucket.allowed_mime_types ?? null,
    };

    return NextResponse.json({ bucket: info });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', details: String(err?.message || err) }, { status: 500 });
  }
}

