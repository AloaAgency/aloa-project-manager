import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET specific interaction data for an applet
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');
    const userEmail = searchParams.get('userEmail');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'submission';

    console.log('Fetching applet interaction:', { projectId, appletId, userEmail, userId, type });

    if (!appletId) {
      return NextResponse.json({ error: 'Applet ID is required' }, { status: 400 });
    }

    // Build query based on available parameters
    let query = supabase
      .from('aloa_applet_interactions')
      .select('*')
      .eq('applet_id', appletId)
      .eq('interaction_type', type)
      .order('created_at', { ascending: false })
      .limit(1);

    // Add user filter if provided
    if (userEmail) {
      query = query.eq('user_email', userEmail);
    } else if (userId && userId !== 'anonymous') {
      // Try to find by user ID (though the table uses email)
      const { data: userProfile } = await supabase
        .from('aloa_user_profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userProfile) {
        query = query.eq('user_email', userProfile.email);
      }
    }

    const { data, error } = await query;

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching interaction:', error);
      return NextResponse.json({ error: 'Failed to fetch interaction' }, { status: 500 });
    }

    console.log('Found interaction data:', data);

    // Return in the format expected by the frontend
    return NextResponse.json({ interactions: data || [] });
  } catch (error) {
    console.error('Error in applet-interactions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}