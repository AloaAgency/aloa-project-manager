import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';

async function getAdminClient() {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {}
      }
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const serviceSupabase = createServiceClient();
  const { data: profile } = await serviceSupabase
    .from('aloa_user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  if (!role || (role !== 'super_admin' && role !== 'project_admin')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { serviceSupabase };
}

// GET all library applets
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    const auth = await getAdminClient();
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    let query = serviceSupabase
      .from('aloa_applet_library')
      .select('*')
      .order('usage_count', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data: applets, error } = await query;

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch applet library' }, { status: 500 });
    }

    // Add caching headers - library rarely changes, cache for 5 minutes
    const response = NextResponse.json({ applets: applets || [] });
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new library applet
export async function POST(request) {
  try {
    const body = await request.json();

    const auth = await getAdminClient();
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    const { data: applet, error } = await serviceSupabase
      .from('aloa_applet_library')
      .insert([{
        name: body.name,
        description: body.description,
        type: body.type,
        icon: body.icon,
        config_schema: body.config_schema || {},
        default_config: body.default_config || {},
        is_client_facing: body.is_client_facing !== false,
        requires_approval: body.requires_approval || false,
        allows_revision: body.allows_revision || false,
        auto_completes: body.auto_completes || false,
        tags: body.tags || [],
        created_by: body.created_by || 'admin'
      }])
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to create library applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update library applet
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const auth = await getAdminClient();
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    const { data: applet, error } = await serviceSupabase
      .from('aloa_applet_library')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update library applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
