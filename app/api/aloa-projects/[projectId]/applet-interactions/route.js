import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET specific interaction data for an applet
// POST new interaction data for an applet
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { appletId, userId, type, data } = body;

    console.log('Saving applet interaction:', { projectId, appletId, userId, type, data });

    if (!appletId || !type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user email if userId provided
    let userEmail = 'anonymous';
    if (userId && userId !== 'anonymous') {
      const { data: userProfile } = await supabase
        .from('aloa_user_profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userProfile) {
        userEmail = userProfile.email;
      }
    }

    // First check if interaction exists
    const { data: existing } = await supabase
      .from('aloa_applet_interactions')
      .select('id')
      .eq('applet_id', appletId)
      .eq('user_email', userEmail)
      .eq('interaction_type', type)
      .single();

    let savedInteraction, error;

    if (existing) {
      // Update existing interaction
      const result = await supabase
        .from('aloa_applet_interactions')
        .update({
          data: data,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      savedInteraction = result.data;
      error = result.error;
    } else {
      // Insert new interaction
      const result = await supabase
        .from('aloa_applet_interactions')
        .insert([{
          project_id: projectId,
          applet_id: appletId,
          user_email: userEmail,
          interaction_type: type,
          data: data,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      savedInteraction = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error saving interaction:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json({
        error: 'Failed to save interaction',
        details: error.message || error.code
      }, { status: 500 });
    }

    console.log('Interaction saved successfully:', savedInteraction);
    return NextResponse.json({ success: true, interaction: savedInteraction });
  } catch (error) {
    console.error('Error in applet-interactions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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