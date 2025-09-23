import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH update single applet
export async function PATCH(request, { params }) {
  try {
    const { appletId } = params;
    const body = await request.json();

    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .update(body)
      .eq('id', appletId)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE single applet
export async function DELETE(request, { params }) {
  try {
    const { appletId } = params;

    const { error } = await supabase
      .from('aloa_applets')
      .delete()
      .eq('id', appletId);

    if (error) {

      return NextResponse.json({ error: 'Failed to delete applet' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}