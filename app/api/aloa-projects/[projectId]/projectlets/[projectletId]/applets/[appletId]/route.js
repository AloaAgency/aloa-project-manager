import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAdminServiceRole,
  validateUuid,
} from '@/app/api/_utils/admin';

export async function PATCH(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  for (const [value, label] of [
    [params.projectId, 'project ID'],
    [params.projectletId, 'projectlet ID'],
    [params.appletId, 'applet ID'],
  ]) {
    const invalid = validateUuid(value, label);
    if (invalid) {
      return invalid;
    }
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const body = await request.json();

    const updatePayload = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if (updatePayload.form_id === null || updatePayload.form_id === undefined) {
      updatePayload.form_id = null;
    }

    const { data: existingApplet, error: existingError } = await serviceSupabase
      .from('aloa_applets')
      .select('id, projectlet_id')
      .eq('id', params.appletId)
      .maybeSingle();

    if (existingError) {
      console.error('Fetch existing applet error', existingError);
      return handleSupabaseError(existingError, 'Failed to load applet before update');
    }

    if (!existingApplet) {
      return NextResponse.json({ error: 'Applet not found' }, { status: 404 });
    }

    if (existingApplet.projectlet_id !== params.projectletId) {
      return NextResponse.json({ error: 'Applet does not belong to this projectlet' }, { status: 403 });
    }

    const { data: projectlet, error: projectletError } = await serviceSupabase
      .from('aloa_projectlets')
      .select('project_id')
      .eq('id', params.projectletId)
      .maybeSingle();

    if (projectletError) {
      console.error('Fetch projectlet error', projectletError);
      return handleSupabaseError(projectletError, 'Failed to verify projectlet');
    }

    if (!projectlet || projectlet.project_id !== params.projectId) {
      return NextResponse.json({ error: 'Projectlet does not belong to this project' }, { status: 403 });
    }

    const { data: applet, error } = await serviceSupabase
      .from('aloa_applets')
      .update(updatePayload)
      .eq('id', params.appletId)
      .eq('projectlet_id', params.projectletId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Applet PATCH error', error);
      console.error('Applet PATCH error', error);
      return handleSupabaseError(error, 'Failed to update applet');
    }

    return NextResponse.json({ applet });
  } catch (error) {
    console.error('Applet PATCH unexpected error', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const projectletValidation = validateUuid(params.projectletId, 'projectlet ID');
  if (projectletValidation) {
    return projectletValidation;
  }

  const appletValidation = validateUuid(params.appletId, 'applet ID');
  if (appletValidation) {
    return appletValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { error } = await serviceSupabase
      .from('aloa_applets')
      .delete()
      .eq('id', params.appletId)
      .eq('project_id', params.projectId)
      .eq('projectlet_id', params.projectletId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete applet');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
