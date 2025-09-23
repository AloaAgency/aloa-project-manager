import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // Clear all notifications for this project
    const { error } = await supabase
      .from('aloa_applet_interactions')
      .delete()
      .eq('project_id', projectId);

    if (error) {

      return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}