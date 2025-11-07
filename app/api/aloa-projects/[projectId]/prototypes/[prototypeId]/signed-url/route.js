import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
};

export async function GET(request, { params }) {
  try {
    const { projectId, prototypeId } = params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch prototype (RLS ensures membership)
    const { data: prototype, error: protoErr } = await supabase
      .from('aloa_prototypes')
      .select('*')
      .eq('id', prototypeId)
      .eq('aloa_project_id', projectId)
      .maybeSingle();

    if (protoErr) {
      return NextResponse.json({ error: 'Failed to load prototype', details: protoErr.message }, { status: 500 });
    }
    if (!prototype) {
      return NextResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    const service = getServiceClient();
    const results = { file_url: null, screenshot_url: null };

    // Helper to sign a storage key (path) if it looks like one
    const signIfPath = async (key) => {
      if (!key || /^https?:\/\//i.test(key)) return key; // already a URL or empty
      const { data, error } = await service.storage
        .from('prototype-files')
        .createSignedUrl(key, 60 * 60 * 6); // 6 hours
      if (error) throw error;
      return data?.signedUrl || null;
    };

    try {
      results.file_url = await signIfPath(prototype.file_url);
    } catch (e) {
      // leave null
    }
    try {
      results.screenshot_url = await signIfPath(prototype.screenshot_url);
    } catch (e) {
      // leave null
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Signed URL refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

