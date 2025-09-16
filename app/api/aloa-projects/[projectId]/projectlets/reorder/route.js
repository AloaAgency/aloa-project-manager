import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { projectletId, newIndex } = await request.json();

    // Get all projectlets for this project, ordered by sequence_order
    const { data: projectlets, error: fetchError } = await supabase
      .from('aloa_projectlets')
      .select('id, sequence_order')
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching projectlets:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch projectlets' },
        { status: 500 }
      );
    }

    // Find the current projectlet
    const currentIndex = projectlets.findIndex(p => p.id === projectletId);
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: 'Projectlet not found' },
        { status: 404 }
      );
    }

    // Remove the projectlet from its current position
    const [movedProjectlet] = projectlets.splice(currentIndex, 1);

    // Insert it at the new position
    projectlets.splice(newIndex, 0, movedProjectlet);

    // Update sequence_order for all affected projectlets
    const updates = projectlets.map((projectlet, index) => ({
      id: projectlet.id,
      sequence_order: index
    }));

    // Batch update all projectlets with new sequence orders
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('aloa_projectlets')
        .update({ sequence_order: update.sequence_order })
        .eq('id', update.id);

      if (updateError) {
        console.error('Error updating projectlet order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update projectlet order' },
          { status: 500 }
        );
      }
    }

    // Add timeline event
    await supabase
      .from('aloa_project_timeline')
      .insert([{
        project_id: projectId,
        projectlet_id: projectletId,
        event_type: 'projectlet_reordered',
        description: `Projectlet reordered to position ${newIndex + 1}`,
        metadata: { from_index: currentIndex, to_index: newIndex }
      }]);

    return NextResponse.json({
      success: true,
      message: 'Projectlets reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering projectlets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}