import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (appletId) {
      // Get completion data for a specific applet
      const { data: completions, error: completionsError } = await supabase
        .from('aloa_applet_completions')
        .select(`
          id,
          user_id,
          completed_at,
          metadata,
          user:auth.users (
            id,
            email
          )
        `)
        .eq('applet_id', appletId);

      if (completionsError) {
        console.error('Error fetching completions:', completionsError);
        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      // Get user profiles for the completions
      const userIds = completions.map(c => c.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Merge profile data with completions
      const completionsWithProfiles = completions.map(completion => {
        const profile = profiles?.find(p => p.id === completion.user_id) || {};
        return {
          ...completion,
          user: {
            ...completion.user,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          }
        };
      });

      // Calculate completion percentage
      const { data: stakeholders, error: stakeholdersError } = await supabase
        .from('aloa_client_stakeholders')
        .select('user_id')
        .eq('project_id', projectId)
        .not('user_id', 'is', null);

      const totalStakeholders = stakeholders?.length || 0;
      const completedCount = completions?.length || 0;
      const percentage = totalStakeholders > 0 
        ? Math.round((completedCount / totalStakeholders) * 100) 
        : 0;

      return NextResponse.json({
        completions: completionsWithProfiles,
        percentage,
        totalStakeholders,
        completedCount
      });
    } else {
      // Get all applet completions for the project
      const { data: completions, error } = await supabase
        .from('aloa_applet_completions')
        .select(`
          id,
          applet_id,
          user_id,
          completed_at,
          metadata
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching completions:', error);
        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      return NextResponse.json(completions || []);
    }
  } catch (error) {
    console.error('Error in applet-completions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const body = await request.json();
    const { appletId, metadata = {} } = body;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a stakeholder in this project
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('aloa_client_stakeholders')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      // If not a stakeholder, check if they're an admin
      const { data: teamMember, error: teamError } = await supabase
        .from('aloa_project_team')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (teamError || !teamMember) {
        return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 });
      }
    }

    // Insert or update completion record
    const { data: completion, error: completionError } = await supabase
      .from('aloa_applet_completions')
      .upsert({
        project_id: projectId,
        applet_id: appletId,
        user_id: user.id,
        metadata,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'applet_id,user_id'
      })
      .select()
      .single();

    if (completionError) {
      console.error('Error creating completion:', completionError);
      return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 });
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Error in applet-completions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}