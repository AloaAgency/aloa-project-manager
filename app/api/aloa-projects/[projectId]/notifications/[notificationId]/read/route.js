import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST mark notification as read
export async function POST(request, { params }) {
  try {
    const { notificationId } = params;
    
    // Update the interaction record to mark as read
    const { error } = await supabase
      .from('aloa_applet_interactions')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-as-read route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}