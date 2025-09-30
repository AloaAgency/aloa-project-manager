import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAdminServiceRole,
  validateUuid,
  UUID_REGEX,
} from '@/app/api/_utils/admin';

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
    const { projectletId, newIndex } = await request.json();

    if (!projectletId || !UUID_REGEX.test(projectletId)) {
      return NextResponse.json({ error: 'Valid projectlet ID required' }, { status: 400 });
    }

    if (typeof newIndex !== 'number' || newIndex < 0) {
      return NextResponse.json({ error: 'New index must be a non-negative number' }, { status: 400 });
    }

    const { data: projectlets, error: fetchError } = await serviceSupabase
      .from('aloa_projectlets')
      .select('id, order_index')
      .eq('project_id', params.projectId)
      .order('order_index', { ascending: true });

    if (fetchError) {
      return handleSupabaseError(fetchError, 'Failed to fetch projectlets');
    }

    const currentIndex = (projectlets || []).findIndex((p) => p.id === projectletId);

    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Projectlet not found' }, { status: 404 });
    }

    const ordered = [...projectlets];
    const [movedProjectlet] = ordered.splice(currentIndex, 1);
    ordered.splice(newIndex, 0, movedProjectlet);

    for (let index = 0; index < ordered.length; index += 1) {
      const { error: updateError } = await serviceSupabase
        .from('aloa_projectlets')
        .update({ order_index: index })
        .eq('id', ordered[index].id)
        .eq('project_id', params.projectId);

      if (updateError) {
        return handleSupabaseError(updateError, 'Failed to update projectlet order');
      }
    }

    const { error: timelineError } = await serviceSupabase
      .from('aloa_project_timeline')
      .insert([
        {
          project_id: params.projectId,
          projectlet_id: projectletId,
          event_type: 'projectlet_reordered',
          description: `Projectlet reordered to position ${newIndex + 1}`,
          metadata: { from_index: currentIndex, to_index: newIndex },
        },
      ]);

    if (timelineError) {
      return handleSupabaseError(timelineError, 'Failed to record projectlet reorder');
    }

    return NextResponse.json({ success: true, message: 'Projectlets reordered successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
