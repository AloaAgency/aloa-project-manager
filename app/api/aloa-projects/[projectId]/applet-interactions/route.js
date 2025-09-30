import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAuthenticatedSupabase,
  validateUuid,
  UUID_REGEX,
} from '@/app/api/_utils/admin';

export async function POST(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin } = authContext;
  const serviceSupabase = createServiceClient();

  try {
    const body = await request.json();
    const { appletId, userId, type, data } = body || {};

    const appletValidation = validateUuid(appletId, 'applet ID');
    if (appletValidation) {
      return appletValidation;
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Interaction type is required' }, { status: 400 });
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Interaction data must be provided' }, { status: 400 });
    }

    const actingUserId = userId || user.id;

    if (userId && !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (actingUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin) {
      const hasAccess = await hasProjectAccess(serviceSupabase, params.projectId, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    let userEmail = user.email || 'anonymous';

    if (actingUserId !== user.id) {
      const { data: profile, error: profileError } = await serviceSupabase
        .from('aloa_user_profiles')
        .select('email')
        .eq('id', actingUserId)
        .maybeSingle();

      if (profileError) {
        return handleSupabaseError(profileError, 'Failed to resolve user email');
      }

      if (!profile?.email) {
        return NextResponse.json({ error: 'Target user email not found' }, { status: 404 });
      }

      userEmail = profile.email;
    }

    const { data: existing, error: existingError } = await serviceSupabase
      .from('aloa_applet_interactions')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('applet_id', appletId)
      .eq('user_email', userEmail)
      .eq('interaction_type', type)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      return handleSupabaseError(existingError, 'Failed to load interaction');
    }

    let savedInteraction = null;
    let mutationError = null;

    if (existing) {
      const { data: updated, error: updateError } = await serviceSupabase
        .from('aloa_applet_interactions')
        .update({ data })
        .eq('id', existing.id)
        .eq('project_id', params.projectId)
        .select()
        .maybeSingle();

      savedInteraction = updated;
      mutationError = updateError;
    } else {
      const { data: inserted, error: insertError } = await serviceSupabase
        .from('aloa_applet_interactions')
        .insert([
          {
            project_id: params.projectId,
            applet_id: appletId,
            user_email: userEmail,
            interaction_type: type,
            data,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .maybeSingle();

      savedInteraction = inserted;
      mutationError = insertError;
    }

    if (mutationError) {
      return handleSupabaseError(mutationError, 'Failed to save interaction');
    }

    return NextResponse.json({ success: true, interaction: savedInteraction });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin } = authContext;
  const serviceSupabase = createServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');
    const type = searchParams.get('type') || 'submission';
    const userEmailFilter = searchParams.get('userEmail');
    const userIdFilter = searchParams.get('userId');

    const appletValidation = validateUuid(appletId, 'applet ID');
    if (appletValidation) {
      return appletValidation;
    }

    if (!isAdmin) {
      const hasAccess = await hasProjectAccess(serviceSupabase, params.projectId, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const query = serviceSupabase
      .from('aloa_applet_interactions')
      .select('*')
      .eq('project_id', params.projectId)
      .eq('applet_id', appletId)
      .eq('interaction_type', type)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userEmailFilter) {
      query.eq('user_email', userEmailFilter);
    } else if (userIdFilter) {
      if (!UUID_REGEX.test(userIdFilter)) {
        return NextResponse.json({ error: 'Invalid user ID filter' }, { status: 400 });
      }

      if (userIdFilter !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data: profile, error: profileError } = await serviceSupabase
        .from('aloa_user_profiles')
        .select('email')
        .eq('id', userIdFilter)
        .maybeSingle();

      if (profileError) {
        return handleSupabaseError(profileError, 'Failed to resolve user email');
      }

      if (!profile?.email) {
        return NextResponse.json({ interactions: [] });
      }

      query.eq('user_email', profile.email);
    }

    const { data, error } = await query;

    if (error && error.code !== 'PGRST116') {
      return handleSupabaseError(error, 'Failed to fetch interaction');
    }

    return NextResponse.json({ interactions: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
