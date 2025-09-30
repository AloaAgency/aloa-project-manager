import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAdminServiceRole,
  validateUuid,
} from '@/app/api/_utils/admin';

export async function PATCH(request, { params }) {
  const projectValidation = validateUuid(params.projectId, 'project ID');
  if (projectValidation) {
    return projectValidation;
  }

  const projectletValidation = validateUuid(params.projectletId, 'projectlet ID');
  if (projectletValidation) {
    return projectletValidation;
  }

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { applets } = await request.json();

    if (!Array.isArray(applets) || applets.length === 0) {
      return NextResponse.json({ error: 'Invalid applets data' }, { status: 400 });
    }

    for (let index = 0; index < applets.length; index += 1) {
      const applet = applets[index];
      const appletValidation = validateUuid(applet.id, 'applet ID');
      if (appletValidation) {
        return appletValidation;
      }

      const { error } = await serviceSupabase
        .from('aloa_applets')
        .update({ order_index: applet.order_index ?? index })
        .eq('id', applet.id)
        .eq('project_id', params.projectId)
        .eq('projectlet_id', params.projectletId);

      if (error) {
        return handleSupabaseError(error, 'Failed to reorder applets');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
