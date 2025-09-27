import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const { projectId, projectletId, appletId } = params;

  try {
    const supabase = createServerClient();

    // Fetch all progress records for this applet with user info
    const { data: progressData, error } = await supabase
      .from('aloa_applet_progress')
      .select(`
        *,
        user:aloa_user_profiles(
          email,
          full_name
        )
      `)
      .eq('applet_id', appletId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Format the data to include user names
    const formattedData = progressData.map(progress => ({
      ...progress,
      user_name: progress.user?.full_name || progress.user?.email || 'Unknown User',
      email: progress.user?.email
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error in progress endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}