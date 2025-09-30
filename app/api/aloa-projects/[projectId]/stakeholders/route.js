import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAuthenticatedSupabase,
  requireAdminServiceRole,
  validateUuid,
  UUID_REGEX,
} from '@/app/api/_utils/admin';
import { createServiceClient } from '@/lib/supabase-service';

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
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
    if (!isAdmin) {
      const hasAccess = await hasProjectAccess(serviceSupabase, params.projectId, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: stakeholders, error } = await serviceSupabase
      .from('aloa_client_stakeholders')
      .select('*')
      .eq('project_id', params.projectId)
      .order('importance_score', { ascending: false })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch stakeholders');
    }

    let enrichedStakeholders = stakeholders || [];

    const userIds = enrichedStakeholders
      .map((stakeholder) => stakeholder.user_id)
      .filter((id) => Boolean(id));

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await serviceSupabase
        .from('aloa_user_profiles')
        .select('id, email, full_name, avatar_url, role')
        .in('id', userIds);

      if (profilesError) {
        return handleSupabaseError(profilesError, 'Failed to load stakeholder profiles');
      }

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

      enrichedStakeholders = enrichedStakeholders.map((stakeholder) => ({
        ...stakeholder,
        user: stakeholder.user_id ? profileMap.get(stakeholder.user_id) || null : null,
      }));
    }

    return NextResponse.json({
      stakeholders: enrichedStakeholders,
      count: enrichedStakeholders.length,
    });
  } catch (error) {
    console.error('Stakeholders GET error', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const body = await request.json();

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Stakeholder name is required' }, { status: 400 });
    }

    let userId = body.user_id;
    if (userId && !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!userId && body.create_user && body.email) {
      try {
        const inviteResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            email: body.email,
            full_name: body.name,
            role: body.user_role || 'client',
            send_email: true,
          }),
        });

        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          userId = inviteData.user?.id;

          const clientRoles = ['client', 'client_admin', 'client_participant'];
          if (userId && (clientRoles.includes(body.user_role) || !body.user_role)) {
            await fetch(`${request.nextUrl.origin}/api/auth/users/assign-project`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: request.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                userId,
                projectId: params.projectId,
              }),
            });
          }
        }
      } catch (error) {
        // Invitation failures are non-fatal; proceed without user account.
      }
    }

    const stakeholderData = {
      project_id: params.projectId,
      user_id: userId || null,
      name: body.name,
      title: body.title || null,
      role: body.role || null,
      email: body.email || null,
      phone: body.phone || null,
      bio: body.bio || null,
      responsibilities: body.responsibilities || null,
      preferences: body.preferences || null,
      avatar_url: body.avatar_url || null,
      linkedin_url: body.linkedin_url || null,
      importance_score: Number.isFinite(body.importance_score) ? body.importance_score : 5,
      is_primary: normalizeBoolean(body.is_primary, false),
      metadata: body.metadata || {},
      created_by: body.created_by || 'admin',
    };

    if (stakeholderData.is_primary) {
      const { error: unsetError } = await serviceSupabase
        .from('aloa_client_stakeholders')
        .update({ is_primary: false })
        .eq('project_id', params.projectId)
        .eq('is_primary', true);

      if (unsetError) {
        return handleSupabaseError(unsetError, 'Failed to reset existing primary stakeholder');
      }
    }

    const { data: stakeholder, error } = await serviceSupabase
      .from('aloa_client_stakeholders')
      .insert([stakeholderData])
      .select(
        `
          *,
          user:aloa_user_profiles (
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        `
      )
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to create stakeholder');
    }

    if (stakeholderData.user_id) {
      const { data: existingMember, error: memberError } = await serviceSupabase
        .from('aloa_project_members')
        .select('id')
        .eq('project_id', params.projectId)
        .eq('user_id', stakeholderData.user_id)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        return handleSupabaseError(memberError, 'Failed to verify project membership');
      }

      if (!existingMember) {
        const { error: addMemberError } = await serviceSupabase
          .from('aloa_project_members')
          .insert({
            project_id: params.projectId,
            user_id: stakeholderData.user_id,
            project_role: 'viewer',
            added_by: body.created_by || 'admin',
          });

        if (addMemberError) {
          return handleSupabaseError(addMemberError, 'Failed to add stakeholder as project member');
        }
      }
    }

    const { error: aiError } = await serviceSupabase.rpc('update_project_ai_context', {
      p_project_id: params.projectId,
    });

    if (aiError && aiError.code !== 'PGRST116') {
      return handleSupabaseError(aiError, 'Failed to refresh project AI context');
    }

    return NextResponse.json({ success: true, stakeholder });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholderId');

    if (!stakeholderId || !UUID_REGEX.test(stakeholderId)) {
      return NextResponse.json({ error: 'Valid stakeholder ID required' }, { status: 400 });
    }

    const body = await request.json();
    let userId = body.user_id;

    if (userId && !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!userId && body.create_user && body.email) {
      try {
        const inviteResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            email: body.email,
            full_name: body.name,
            role: body.user_role || 'client',
            send_email: true,
          }),
        });

        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          userId = inviteData.user?.id;

          const clientRoles = ['client', 'client_admin', 'client_participant'];
          if (userId && (clientRoles.includes(body.user_role) || !body.user_role)) {
            await fetch(`${request.nextUrl.origin}/api/auth/users/assign-project`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: request.headers.get('cookie') || '',
              },
              body: JSON.stringify({
                userId,
                projectId: params.projectId,
              }),
            });
          }
        }
      } catch (error) {
        // ignore invite errors
      }
    }

    const updateData = {};

    if (userId !== undefined) updateData.user_id = userId;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.responsibilities !== undefined) updateData.responsibilities = body.responsibilities;
    if (body.preferences !== undefined) updateData.preferences = body.preferences;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.linkedin_url !== undefined) updateData.linkedin_url = body.linkedin_url;
    if (body.importance_score !== undefined) updateData.importance_score = body.importance_score;
    if (body.is_primary !== undefined) updateData.is_primary = normalizeBoolean(body.is_primary);
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    if (updateData.is_primary === true) {
      const { error: unsetError } = await serviceSupabase
        .from('aloa_client_stakeholders')
        .update({ is_primary: false })
        .eq('project_id', params.projectId)
        .eq('is_primary', true)
        .neq('id', stakeholderId);

      if (unsetError) {
        return handleSupabaseError(unsetError, 'Failed to reset existing primary stakeholder');
      }
    }

    const { data: stakeholder, error } = await serviceSupabase
      .from('aloa_client_stakeholders')
      .update(updateData)
      .eq('id', stakeholderId)
      .eq('project_id', params.projectId)
      .select(
        `
          *,
          user:aloa_user_profiles (
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        `
      )
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to update stakeholder');
    }

    const { error: aiError } = await serviceSupabase.rpc('update_project_ai_context', {
      p_project_id: params.projectId,
    });

    if (aiError && aiError.code !== 'PGRST116') {
      return handleSupabaseError(aiError, 'Failed to refresh project AI context');
    }

    return NextResponse.json({ success: true, stakeholder });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholderId');

    if (!stakeholderId || !UUID_REGEX.test(stakeholderId)) {
      return NextResponse.json({ error: 'Valid stakeholder ID required' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('aloa_client_stakeholders')
      .delete()
      .eq('id', stakeholderId)
      .eq('project_id', params.projectId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete stakeholder');
    }

    const { error: aiError } = await serviceSupabase.rpc('update_project_ai_context', {
      p_project_id: params.projectId,
    });

    if (aiError && aiError.code !== 'PGRST116') {
      return handleSupabaseError(aiError, 'Failed to refresh project AI context');
    }

    return NextResponse.json({ success: true, message: 'Stakeholder deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
