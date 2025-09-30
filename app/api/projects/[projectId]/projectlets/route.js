import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAdminServiceRole,
  requireAuthenticatedSupabase,
} from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  try {
    const authContext = await requireAuthenticatedSupabase();
    if (authContext.error) {
      return authContext.error;
    }

    const { supabase } = authContext;
    const { projectId } = params;

    // Get projectlets for this project
    const { data: projectlets, error } = await supabase
      .from('aloa_projectlets')
      .select(`
        *,
        aloa_project_forms (
          id,
          title,
          description,
          form_type,
          is_active,
          responses_required,
          responses_received
        )
      `)
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch projectlets');
    }

    const projectletsSafe = projectlets || [];
    // Calculate completion percentage
    const totalProjectlets = projectletsSafe.length;
    const completedProjectlets = projectletsSafe.filter(p => p.status === 'completed').length;
    const completionPercentage = totalProjectlets > 0 
      ? Math.round((completedProjectlets / totalProjectlets) * 100)
      : 0;

    return NextResponse.json({
      projectlets: projectletsSafe,
      stats: {
        total: totalProjectlets,
        completed: completedProjectlets,
        inProgress: projectletsSafe.filter(p => p.status === 'in_progress').length,
        available: projectletsSafe.filter(p => p.status === 'available').length,
        locked: projectletsSafe.filter(p => p.status === 'locked').length,
        completionPercentage
      }
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update projectlet status
export async function PATCH(request, { params }) {
  try {
    const adminContext = await requireAdminServiceRole();
    if (adminContext.error) {
      return adminContext.error;
    }

    const { serviceSupabase } = adminContext;
    const { projectId } = params;
    const { projectletId, status, metadata } = await request.json();

    // Update the projectlet
    const { data: updatedProjectlet, error: updateError } = await serviceSupabase
      .from('aloa_projectlets')
      .update({
        status,
        ...(metadata && { metadata }),
        ...(status === 'completed' && { completion_date: new Date().toISOString() })
      })
      .eq('id', projectletId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError, 'Failed to update projectlet');
    }

    // If projectlet is completed, check if we need to unlock the next one
    if (status === 'completed') {
      // Get the next projectlet in sequence
      const { data: nextProjectlet, error: nextProjectletError } = await serviceSupabase
        .from('aloa_projectlets')
        .select()
        .eq('project_id', projectId)
        .eq('status', 'locked')
        .gt('sequence_order', updatedProjectlet.sequence_order)
        .order('sequence_order', { ascending: true })
        .limit(1)
        .single();

      if (nextProjectletError && nextProjectletError.code !== 'PGRST116') {
        return handleSupabaseError(nextProjectletError, 'Failed to load next projectlet');
      }

      if (nextProjectlet && nextProjectlet.unlock_condition?.type === 'previous_complete') {
        // Unlock the next projectlet
        const { error: unlockError } = await serviceSupabase
          .from('aloa_projectlets')
          .update({ status: 'available' })
          .eq('id', nextProjectlet.id);

        if (unlockError) {
          return handleSupabaseError(unlockError, 'Failed to unlock next projectlet');
        }

        // Add timeline event
        const { error: unlockTimelineError } = await serviceSupabase
          .from('aloa_project_timeline')
          .insert([{
            project_id: projectId,
            projectlet_id: nextProjectlet.id,
            event_type: 'projectlet_unlocked',
            description: `"${nextProjectlet.name}" is now available`,
            metadata: { previous_projectlet: updatedProjectlet.name }
          }]);

        if (unlockTimelineError) {
          return handleSupabaseError(unlockTimelineError, 'Failed to record unlock timeline event');
        }
      }

      // Add completion timeline event
      const { error: completionTimelineError } = await serviceSupabase
        .from('aloa_project_timeline')
        .insert([{
          project_id: projectId,
          projectlet_id: projectletId,
          event_type: 'projectlet_completed',
          description: `"${updatedProjectlet.name}" completed`,
          metadata: { completion_date: new Date().toISOString() }
        }]);

      if (completionTimelineError) {
        return handleSupabaseError(completionTimelineError, 'Failed to record completion timeline event');
      }
    }

    return NextResponse.json({
      success: true,
      projectlet: updatedProjectlet
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
