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

  const projectletValidation = validateUuid(params.projectletId, 'projectlet ID');
  if (projectletValidation) {
    return projectletValidation;
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

    const { data: steps, error } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .select('*')
      .eq('projectlet_id', params.projectletId)
      .eq('project_id', params.projectId)
      .order('sequence_order', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch steps');
    }

    return NextResponse.json({
      steps: steps || [],
      count: steps?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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
    const body = await request.json();

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Step name is required' }, { status: 400 });
    }

    const { data: maxOrder, error: maxOrderError } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .select('sequence_order')
      .eq('projectlet_id', params.projectletId)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderError && maxOrderError.code !== 'PGRST116') {
      return handleSupabaseError(maxOrderError, 'Failed to calculate step order');
    }

    const newStep = {
      projectlet_id: params.projectletId,
      project_id: params.projectId,
      name: body.name,
      description: body.description,
      type: body.type,
      sequence_order: (maxOrder?.sequence_order || 0) + 1,
      is_required: body.is_required !== false,
      form_id: body.form_id || null,
      link_url: body.link_url || null,
      metadata: body.metadata || {},
    };

    const { data: step, error } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .insert([newStep])
      .select()
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to create step');
    }

    return NextResponse.json({ success: true, step });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { stepId, ...updateData } = body || {};

    if (!stepId || !UUID_REGEX.test(stepId)) {
      return NextResponse.json({ error: 'Valid step ID required' }, { status: 400 });
    }

    if (updateData.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: step, error } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .update(updateData)
      .eq('id', stepId)
      .eq('projectlet_id', params.projectletId)
      .eq('project_id', params.projectId)
      .select()
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to update step');
    }

    const { data: allSteps, error: allStepsError } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .select('status, is_required')
      .eq('projectlet_id', params.projectletId);

    if (allStepsError) {
      return handleSupabaseError(allStepsError, 'Failed to recalculate step statuses');
    }

    const requiredSteps = (allSteps || []).filter((s) => s.is_required);
    const completedRequired = requiredSteps.filter((s) => s.status === 'completed');

    if (requiredSteps.length > 0 && completedRequired.length === requiredSteps.length) {
      const { error: projectletUpdateError } = await serviceSupabase
        .from('aloa_projectlets')
        .update({ status: 'completed', completion_date: new Date().toISOString() })
        .eq('id', params.projectletId)
        .eq('project_id', params.projectId);

      if (projectletUpdateError) {
        return handleSupabaseError(projectletUpdateError, 'Failed to complete projectlet');
      }

      const { data: currentProjectlet, error: currentProjectletError } = await serviceSupabase
        .from('aloa_projectlets')
        .select('sequence_order')
        .eq('id', params.projectletId)
        .maybeSingle();

      if (currentProjectletError) {
        return handleSupabaseError(currentProjectletError, 'Failed to load projectlet order');
      }

      if (currentProjectlet) {
        const { data: nextProjectlet, error: nextProjectletError } = await serviceSupabase
          .from('aloa_projectlets')
          .select('id')
          .eq('project_id', params.projectId)
          .eq('status', 'locked')
          .gt('sequence_order', currentProjectlet.sequence_order)
          .order('sequence_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextProjectletError && nextProjectletError.code !== 'PGRST116') {
          return handleSupabaseError(nextProjectletError, 'Failed to load next projectlet');
        }

        if (nextProjectlet) {
          const { error: unlockError } = await serviceSupabase
            .from('aloa_projectlets')
            .update({ status: 'available' })
            .eq('id', nextProjectlet.id)
            .eq('project_id', params.projectId);

          if (unlockError) {
            return handleSupabaseError(unlockError, 'Failed to unlock next projectlet');
          }
        }
      }

      const { error: timelineError } = await serviceSupabase
        .from('aloa_project_timeline')
        .insert([
          {
            project_id: params.projectId,
            projectlet_id: params.projectletId,
            event_type: 'projectlet_completed',
            description: 'All required steps completed',
            metadata: { auto_completed: true },
          },
        ]);

      if (timelineError) {
        return handleSupabaseError(timelineError, 'Failed to record completion timeline');
      }
    } else if (updateData.status === 'in_progress' && requiredSteps.length > 0) {
      const { error: inProgressError } = await serviceSupabase
        .from('aloa_projectlets')
        .update({ status: 'in_progress' })
        .eq('id', params.projectletId)
        .eq('project_id', params.projectId)
        .eq('status', 'available');

      if (inProgressError && inProgressError.code !== 'PGRST116') {
        return handleSupabaseError(inProgressError, 'Failed to update projectlet status');
      }
    }

    return NextResponse.json({ success: true, step });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { searchParams } = new URL(request.url);
    const stepId = searchParams.get('stepId');

    if (!stepId || !UUID_REGEX.test(stepId)) {
      return NextResponse.json({ error: 'Valid step ID required' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .delete()
      .eq('id', stepId)
      .eq('projectlet_id', params.projectletId)
      .eq('project_id', params.projectId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete step');
    }

    const { data: remainingSteps, error: remainingError } = await serviceSupabase
      .from('aloa_projectlet_steps')
      .select('id')
      .eq('projectlet_id', params.projectletId)
      .eq('project_id', params.projectId)
      .order('sequence_order', { ascending: true });

    if (remainingError) {
      return handleSupabaseError(remainingError, 'Failed to load remaining steps');
    }

    for (let index = 0; index < (remainingSteps || []).length; index += 1) {
      const { error: reorderError } = await serviceSupabase
        .from('aloa_projectlet_steps')
        .update({ sequence_order: index + 1 })
        .eq('id', remainingSteps[index].id);

      if (reorderError) {
        return handleSupabaseError(reorderError, 'Failed to reorder steps');
      }
    }

    return NextResponse.json({ success: true, message: 'Step deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
