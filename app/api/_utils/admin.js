import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createClient } from '@/lib/supabase-server';

export const ADMIN_ROLES = ['super_admin', 'project_admin'];
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(value, label = 'ID') {
  if (!value || !UUID_REGEX.test(value)) {
    return NextResponse.json({ error: `Invalid ${label}` }, { status: 400 });
  }
  return null;
}

export async function requireAuthenticatedSupabase() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('aloa_user_profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return { error: NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 }) };
  }

  const role = profile?.role || null;
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;

  return {
    supabase,
    user: {
      ...user,
      profile
    },
    profile,
    role,
    isAdmin
  };
}

export async function requireAdminServiceRole() {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext;
  }

  const { supabase, user, profile, role, isAdmin } = authContext;

  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const serviceSupabase = createServiceClient();

  return {
    serviceSupabase,
    supabase,
    user,
    profile,
    role,
    isAdmin
  };
}

export function handleSupabaseError(error, fallbackMessage = 'Supabase query failed') {
  const code = error?.code;

  if (code === '42501') {
    return NextResponse.json({ error: 'Access denied', details: error?.message }, { status: 403 });
  }

  return NextResponse.json({ error: fallbackMessage, details: error?.message }, { status: 500 });
}

export async function hasProjectAccess(serviceSupabase, projectId, userId) {
  const { data: member, error: memberError } = await serviceSupabase
    .from('aloa_project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError && memberError.code !== 'PGRST116') {
    throw memberError;
  }

  if (member) {
    return true;
  }

  const { data: stakeholder, error: stakeholderError } = await serviceSupabase
    .from('aloa_client_stakeholders')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (stakeholderError && stakeholderError.code !== 'PGRST116') {
    throw stakeholderError;
  }

  return Boolean(stakeholder);
}
