import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PUT reorder applets
export async function PUT(request, { params }) {
  try {
    const { projectletId } = params;
    const { appletIds } = await request.json();

    // Update order_index for each applet
    const updates = appletIds.map((appletId, index) => ({
      id: appletId,
      projectlet_id: projectletId,
      order_index: index
    }));

    // Batch update all applets
    for (const update of updates) {
      const { error } = await supabase
        .from('aloa_applets')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('projectlet_id', update.projectlet_id);

      if (error) {
        console.error('Error updating applet order:', error);
        return NextResponse.json({ error: 'Failed to reorder applets' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in applet reordering:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}