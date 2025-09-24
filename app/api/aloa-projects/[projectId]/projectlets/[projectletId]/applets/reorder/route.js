import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH reorder applets
export async function PATCH(request, { params }) {
  try {
    const { projectletId } = params;
    const body = await request.json();

    const { applets } = body;

    if (!applets || !Array.isArray(applets)) {

      return NextResponse.json({ error: 'Invalid applets data' }, { status: 400 });
    }

    // Update order_index for each applet
    const updates = applets.map((applet, index) => ({
      id: applet.id,
      projectlet_id: projectletId,
      order_index: applet.order_index !== undefined ? applet.order_index : index
    }));

    // Batch update all applets
    for (const update of updates) {
      const { error } = await supabase
        .from('aloa_applets')
        .update({ order_index: update.order_index })
        .eq('id', update.id)
        .eq('projectlet_id', update.projectlet_id);

      if (error) {

        return NextResponse.json({ error: error.message || 'Failed to reorder applets' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}