import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all steps for a projectlet
export async function GET(request, { params }) {
  try {
    const { projectId, projectletId } = params;

    const { data: steps, error } = await supabase
      .from('aloa_projectlet_steps')
      .select(`
        *,
        forms (
          id,
          title,
          status
        )
      `)
      .eq('projectlet_id', projectletId)
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (error) {
      console.error('Error fetching steps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch steps' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      steps: steps || [],
      count: steps?.length || 0
    });

  } catch (error) {
    console.error('Error in steps route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new step to projectlet
export async function POST(request, { params }) {
  try {
    const { projectId, projectletId } = params;
    const body = await request.json();

    // Get the max sequence order
    const { data: maxOrder } = await supabase
      .from('aloa_projectlet_steps')
      .select('sequence_order')
      .eq('projectlet_id', projectletId)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .single();

    const newStep = {
      projectlet_id: projectletId,
      project_id: projectId,
      name: body.name,
      description: body.description,
      type: body.type,
      sequence_order: (maxOrder?.sequence_order || 0) + 1,
      is_required: body.is_required !== false,
      form_id: body.form_id || null,
      link_url: body.link_url || null,
      metadata: body.metadata || {}
    };

    const { data: step, error } = await supabase
      .from('aloa_projectlet_steps')
      .insert([newStep])
      .select()
      .single();

    if (error) {
      console.error('Error creating step:', error);
      return NextResponse.json(
        { error: 'Failed to create step' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      step
    });

  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update step status or details
export async function PATCH(request, { params }) {
  try {
    const { projectId, projectletId } = params;
    const body = await request.json();
    const { stepId, ...updateData } = body;

    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID required' },
        { status: 400 }
      );
    }

    // If marking as completed, add completion timestamp
    if (updateData.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: step, error } = await supabase
      .from('aloa_projectlet_steps')
      .update(updateData)
      .eq('id', stepId)
      .eq('projectlet_id', projectletId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating step:', error);
      return NextResponse.json(
        { error: 'Failed to update step' },
        { status: 500 }
      );
    }

    // Check if all required steps are completed
    const { data: allSteps } = await supabase
      .from('aloa_projectlet_steps')
      .select('status, is_required')
      .eq('projectlet_id', projectletId);

    const requiredSteps = allSteps?.filter(s => s.is_required) || [];
    const completedRequired = requiredSteps.filter(s => s.status === 'completed');
    
    // Auto-complete projectlet if all required steps are done
    if (requiredSteps.length > 0 && completedRequired.length === requiredSteps.length) {
      // Mark projectlet as completed
      await supabase
        .from('aloa_projectlets')
        .update({ 
          status: 'completed', 
          completion_date: new Date().toISOString() 
        })
        .eq('id', projectletId);

      // Check if there's a next projectlet to unlock
      const { data: currentProjectlet } = await supabase
        .from('aloa_projectlets')
        .select('sequence_order')
        .eq('id', projectletId)
        .single();

      if (currentProjectlet) {
        const { data: nextProjectlet } = await supabase
          .from('aloa_projectlets')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'locked')
          .gt('sequence_order', currentProjectlet.sequence_order)
          .order('sequence_order', { ascending: true })
          .limit(1)
          .single();

        if (nextProjectlet) {
          // Unlock the next projectlet
          await supabase
            .from('aloa_projectlets')
            .update({ status: 'available' })
            .eq('id', nextProjectlet.id);
        }
      }

      // Add timeline event
      await supabase
        .from('aloa_project_timeline')
        .insert([{
          project_id: projectId,
          projectlet_id: projectletId,
          event_type: 'projectlet_completed',
          description: 'All required steps completed',
          metadata: { auto_completed: true }
        }]);
    } else if (updateData.status === 'in_progress' && requiredSteps.length > 0) {
      // If a step is marked in progress, ensure projectlet is also in progress
      await supabase
        .from('aloa_projectlets')
        .update({ status: 'in_progress' })
        .eq('id', projectletId)
        .eq('status', 'available');
    }

    return NextResponse.json({
      success: true,
      step
    });

  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a step
export async function DELETE(request, { params }) {
  try {
    const { projectId, projectletId } = params;
    const { searchParams } = new URL(request.url);
    const stepId = searchParams.get('stepId');

    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('aloa_projectlet_steps')
      .delete()
      .eq('id', stepId)
      .eq('projectlet_id', projectletId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting step:', error);
      return NextResponse.json(
        { error: 'Failed to delete step' },
        { status: 500 }
      );
    }

    // Reorder remaining steps
    const { data: remainingSteps } = await supabase
      .from('aloa_projectlet_steps')
      .select('id')
      .eq('projectlet_id', projectletId)
      .order('sequence_order', { ascending: true });

    // Update sequence orders
    for (let i = 0; i < remainingSteps.length; i++) {
      await supabase
        .from('aloa_projectlet_steps')
        .update({ sequence_order: i + 1 })
        .eq('id', remainingSteps[i].id);
    }

    return NextResponse.json({
      success: true,
      message: 'Step deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}