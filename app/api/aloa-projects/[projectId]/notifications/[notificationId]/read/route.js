import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service client to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

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

      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}