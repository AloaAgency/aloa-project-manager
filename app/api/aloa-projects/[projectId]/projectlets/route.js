import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Try to use service client, fall back to regular client if needed
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (serviceError) {

      const { supabase: fallbackClient } = await import('@/lib/supabase');
      supabase = fallbackClient;
      if (!supabase) {
        throw new Error('No Supabase client available');
      }
    }

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
      .order('order_index', { ascending: true });

    if (error) {

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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new projectlet
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { name, description, type } = await request.json();

    // Try to use service client, fall back to regular client if needed
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (serviceError) {

      // Fall back to importing the regular client
      const { supabase: fallbackClient } = await import('@/lib/supabase');
      supabase = fallbackClient;
      if (!supabase) {
        throw new Error('No Supabase client available');
      }
    }

    // Get the max order_index for this project
    const { data: maxOrder } = await supabase
      .from('aloa_projectlets')
      .select('order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const newOrderIndex = maxOrder ? maxOrder.order_index + 1 : 0;

    // Create the new projectlet
    const { data: newProjectlet, error } = await supabase
      .from('aloa_projectlets')
      .insert([{
        project_id: projectId,
        name: name || `New Projectlet ${newOrderIndex + 1}`,
        description: description || 'Click to edit description',
        type: type || 'design',
        status: 'available',
        order_index: newOrderIndex,  // Use order_index instead of sequence_order
        sequence_order: newOrderIndex,  // Keep this for backward compatibility
        metadata: {},
        client_visible: false
      }])
      .select()
      .single();

    if (error) {

      return NextResponse.json(
        { error: 'Failed to create projectlet', details: error.message },
        { status: 500 }
      );
    }

    // Add timeline event
    await supabase
      .from('aloa_project_timeline')
      .insert([{
        project_id: projectId,
        projectlet_id: newProjectlet.id,
        event_type: 'projectlet_created',
        description: `"${newProjectlet.name}" added to project`,
        metadata: {}
      }]);

    return NextResponse.json({
      success: true,
      projectlet: newProjectlet
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Update projectlet status
export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const {
      projectletId,
      status,
      metadata,
      clientVisible: clientVisibleCamel,
      client_visible: clientVisibleSnake
    } = body;

    if (!projectletId) {

      return NextResponse.json(
        { error: 'projectletId is required' },
        { status: 400 }
      );
    }

    const clientVisible = typeof clientVisibleCamel === 'boolean'
      ? clientVisibleCamel
      : typeof clientVisibleSnake === 'boolean'
        ? clientVisibleSnake
        : undefined;

    if (status === undefined && clientVisible === undefined && metadata === undefined) {

      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    // Try to use service client, fall back to regular client if needed
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (serviceError) {

      const { supabase: fallbackClient } = await import('@/lib/supabase');
      supabase = fallbackClient;
      if (!supabase) {
        throw new Error('No Supabase client available');
      }
    }

    // Update the projectlet
    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completion_date = new Date().toISOString();
      }
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    if (clientVisible !== undefined) {
      updateData.client_visible = clientVisible;
    }

    const { data: updatedProjectlet, error: updateError } = await supabase
      .from('aloa_projectlets')
      .update(updateData)
      .eq('id', projectletId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {

      return NextResponse.json(
        { error: 'Failed to update projectlet', details: updateError.message },
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

    // Try to use service client, fall back to regular client if needed
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (serviceError) {

      const { supabase: fallbackClient } = await import('@/lib/supabase');
      supabase = fallbackClient;
      if (!supabase) {
        throw new Error('No Supabase client available');
      }
    }

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

        // Also update the form's project_id in the aloa_forms table
        await supabase
          .from('aloa_forms')
          .update({ aloa_project_id: projectId })
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a projectlet
export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const projectletId = searchParams.get('projectletId');

    // Try to use service client, fall back to regular client if needed
    let supabase;
    try {
      supabase = createServiceClient();
    } catch (serviceError) {

      const { supabase: fallbackClient } = await import('@/lib/supabase');
      supabase = fallbackClient;
      if (!supabase) {
        throw new Error('No Supabase client available');
      }
    }

    if (!projectletId) {
      return NextResponse.json(
        { error: 'Projectlet ID is required' },
        { status: 400 }
      );
    }

    // Delete the projectlet (cascade will handle related records)
    const { error } = await supabase
      .from('aloa_projectlets')
      .delete()
      .eq('id', projectletId)
      .eq('project_id', params.projectId); // Extra safety check

    if (error) {

      return NextResponse.json(
        { error: 'Failed to delete projectlet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Projectlet deleted successfully'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
