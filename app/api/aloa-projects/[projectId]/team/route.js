import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAdminServiceRole,
  requireAuthenticatedSupabase,
  validateUuid,
  UUID_REGEX,
} from '@/app/api/_utils/admin';

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

    const { data: team, error } = await serviceSupabase
      .from('aloa_project_members')
      .select(
        `
          *,
          user:aloa_user_profiles!aloa_project_members_user_id_fkey(
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        `
      )
      .eq('project_id', params.projectId)
      .neq('project_role', 'viewer');

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch team members');
    }

    const formatted = (team || []).map((member) => ({
      id: member.id,
      user_id: member.user_id,
      project_id: member.project_id,
      project_role: member.project_role,
      email: member.user?.email,
      name: member.user?.full_name,
      avatar_url: member.user?.avatar_url,
      system_role: member.user?.role,
    }));

    return NextResponse.json({ team: formatted, count: formatted.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const { user_id, project_role } = await request.json();

    if (!user_id || !UUID_REGEX.test(user_id) || !project_role) {
      return NextResponse.json({ error: 'Valid user ID and project role are required' }, { status: 400 });
    }

    const { data: existingMember, error: existingError } = await serviceSupabase
      .from('aloa_project_members')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      return handleSupabaseError(existingError, 'Failed to verify existing team member');
    }

    if (existingMember) {
      const { data: updatedMember, error: updateError } = await serviceSupabase
        .from('aloa_project_members')
        .update({ project_role })
        .eq('id', existingMember.id)
        .eq('project_id', params.projectId)
        .select(
          `
            *,
            user:aloa_user_profiles!aloa_project_members_user_id_fkey(
              id,
              email,
              full_name,
              avatar_url,
              role
            )
          `
        )
        .maybeSingle();

      if (updateError) {
        return handleSupabaseError(updateError, 'Failed to update team member');
      }

      return NextResponse.json({
        success: true,
        member: {
          id: updatedMember.id,
          user_id: updatedMember.user_id,
          project_id: updatedMember.project_id,
          project_role: updatedMember.project_role,
          email: updatedMember.user?.email,
          name: updatedMember.user?.full_name,
          avatar_url: updatedMember.user?.avatar_url,
          system_role: updatedMember.user?.role,
        },
      });
    }

    const { data: newMember, error } = await serviceSupabase
      .from('aloa_project_members')
      .insert([
        {
          project_id: params.projectId,
          user_id,
          project_role,
        },
      ])
      .select(
        `
          *,
          user:aloa_user_profiles!aloa_project_members_user_id_fkey(
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
      return handleSupabaseError(error, 'Failed to add team member');
    }

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        user_id: newMember.user_id,
        project_id: newMember.project_id,
        project_role: newMember.project_role,
        email: newMember.user?.email,
        name: newMember.user?.full_name,
        avatar_url: newMember.user?.avatar_url,
        system_role: newMember.user?.role,
      },
    });
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
    const memberId = searchParams.get('memberId');

    if (!memberId || !UUID_REGEX.test(memberId)) {
      return NextResponse.json({ error: 'Valid member ID required' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('aloa_project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', params.projectId);

    if (error) {
      return handleSupabaseError(error, 'Failed to remove team member');
    }

    return NextResponse.json({ success: true, message: 'Team member removed' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
