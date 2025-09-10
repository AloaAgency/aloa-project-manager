import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
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
      console.error('Error fetching projectlets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projectlets' },
        { status: 500 }
      );
    }

    // Calculate completion percentage
    const totalProjectlets = projectlets.length;
    const completedProjectlets = projectlets.filter(p => p.status === 'completed').length;
    const completionPercentage = totalProjectlets > 0 
      ? Math.round((completedProjectlets / totalProjectlets) * 100)
      : 0;

    return NextResponse.json({
      projectlets,
      stats: {
        total: totalProjectlets,
        completed: completedProjectlets,
        inProgress: projectlets.filter(p => p.status === 'in_progress').length,
        available: projectlets.filter(p => p.status === 'available').length,
        locked: projectlets.filter(p => p.status === 'locked').length,
        completionPercentage
      }
    });

  } catch (error) {
    console.error('Error in projectlets route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update projectlet status
export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const { projectletId, status, metadata } = await request.json();

    // Update the projectlet
    const { data: updatedProjectlet, error: updateError } = await supabase
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
      console.error('Error updating projectlet:', updateError);
      return NextResponse.json(
        { error: 'Failed to update projectlet' },
        { status: 500 }
      );
    }

    // If projectlet is completed, check if we need to unlock the next one
    if (status === 'completed') {
      // Get the next projectlet in sequence
      const { data: nextProjectlet } = await supabase
        .from('aloa_projectlets')
        .select()
        .eq('project_id', projectId)
        .eq('status', 'locked')
        .gt('sequence_order', updatedProjectlet.sequence_order)
        .order('sequence_order', { ascending: true })
        .limit(1)
        .single();

      if (nextProjectlet && nextProjectlet.unlock_condition?.type === 'previous_complete') {
        // Unlock the next projectlet
        await supabase
          .from('aloa_projectlets')
          .update({ status: 'available' })
          .eq('id', nextProjectlet.id);

        // Add timeline event
        await supabase
          .from('aloa_project_timeline')
          .insert([{
            project_id: projectId,
            projectlet_id: nextProjectlet.id,
            event_type: 'projectlet_unlocked',
            description: `"${nextProjectlet.name}" is now available`,
            metadata: { previous_projectlet: updatedProjectlet.name }
          }]);
      }

      // Add completion timeline event
      await supabase
        .from('aloa_project_timeline')
        .insert([{
          project_id: projectId,
          projectlet_id: projectletId,
          event_type: 'projectlet_completed',
          description: `"${updatedProjectlet.name}" completed`,
          metadata: { completion_date: new Date().toISOString() }
        }]);
    }

    return NextResponse.json({
      success: true,
      projectlet: updatedProjectlet
    });

  } catch (error) {
    console.error('Error updating projectlet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update projectlet details (including form attachment)
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;
    const { 
      projectletId, 
      name, 
      description, 
      type,
      formId,
      deadline,
      metadata 
    } = await request.json();

    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update the projectlet
    const { data: updatedProjectlet, error: updateError } = await supabase
      .from('aloa_projectlets')
      .update(updateData)
      .eq('id', projectletId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating projectlet details:', updateError);
      return NextResponse.json(
        { error: 'Failed to update projectlet details' },
        { status: 500 }
      );
    }

    // Handle form attachment/detachment
    if (formId !== undefined) {
      if (formId) {
        // Check if a form is already attached
        const { data: existingForm } = await supabase
          .from('aloa_project_forms')
          .select('id')
          .eq('projectlet_id', projectletId)
          .single();

        if (existingForm) {
          // Update existing form attachment
          await supabase
            .from('aloa_project_forms')
            .update({ form_id: formId })
            .eq('projectlet_id', projectletId);
        } else {
          // Create new form attachment
          await supabase
            .from('aloa_project_forms')
            .insert([{
              project_id: projectId,
              projectlet_id: projectletId,
              form_id: formId,
              title: updatedProjectlet.name + ' Form',
              form_type: 'projectlet',
              is_active: true
            }]);
        }

        // Also update the form's project_id in the forms table
        await supabase
          .from('forms')
          .update({ project_id: projectId })
          .eq('id', formId);
      } else {
        // Remove form attachment if formId is null
        await supabase
          .from('aloa_project_forms')
          .delete()
          .eq('projectlet_id', projectletId);
      }
    }

    // Get updated projectlet with form info
    const { data: projectletWithForm } = await supabase
      .from('aloa_projectlets')
      .select(`
        *,
        aloa_project_forms (
          id,
          form_id,
          title,
          description,
          form_type,
          is_active,
          responses_required,
          responses_received
        )
      `)
      .eq('id', projectletId)
      .single();

    return NextResponse.json({
      success: true,
      projectlet: projectletWithForm
    });

  } catch (error) {
    console.error('Error updating projectlet details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}