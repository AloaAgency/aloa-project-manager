import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';

export async function authorizeProjectAccess(projectId, { requireAdmin = false } = {}) {
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
  const isAdmin = role === 'super_admin' || role === 'project_admin';

  if (requireAdmin) {
    if (!isAdmin) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { serviceSupabase, user, role, isAdmin };
  }

  if (isAdmin) {
    return { serviceSupabase, user, role, isAdmin };
  }

  const { data: member } = await serviceSupabase
    .from('aloa_project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (member) {
    return { serviceSupabase, user, role, isAdmin };
  }

  const { data: stakeholder } = await serviceSupabase
    .from('aloa_project_stakeholders')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (stakeholder) {
    return { serviceSupabase, user, role, isAdmin };
  }

  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}
