import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    console.log('Applet completions GET request:', { projectId, appletId });

    if (appletId) {
      // Get completion data for a specific applet from aloa_applet_progress
      const { data: completions, error: completionsError } = await supabase
        .from('aloa_applet_progress')
        .select(`
          id,
          user_id,
          status,
          completion_percentage,
          completed_at,
          started_at,
          form_progress
        `)
        .eq('applet_id', appletId)
        .eq('status', 'completed');

      console.log('Fetched completions from aloa_applet_progress:', {
        appletId,
        count: completions?.length || 0,
        completions
      });

      if (completionsError) {
        console.error('Error fetching completions:', completionsError);
        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      // Get user profiles for the completions
      const userIds = completions.map(c => c.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('aloa_user_profiles')
        .select('id, full_name, email, avatar_url')
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
            id: completion.user_id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          }
        };
      });

      // Calculate completion percentage based on project members with viewer role (clients)
      const { data: projectMembers, error: membersError } = await supabase
        .from('aloa_project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('project_role', 'viewer');

      // Also check for any team members who might review files
      const { data: allMembers, error: allMembersError } = await supabase
        .from('aloa_project_members')
        .select('user_id')
        .eq('project_id', projectId);

      // For file uploads and general applets, count all project members as potential completers
      // For forms, only count viewers (clients)
      const { data: appletInfo } = await supabase
        .from('aloa_applets')
        .select('type')
        .eq('id', appletId)
        .single();

      const isFormApplet = appletInfo?.type === 'form';
      const relevantMembers = isFormApplet ? projectMembers : allMembers;
      const totalStakeholders = relevantMembers?.length || 0;
      const completedCount = completions?.length || 0;
      const percentage = totalStakeholders > 0
        ? Math.round((completedCount / totalStakeholders) * 100)
        : 0;

      console.log('Completion calculation:', {
        appletId,
        isFormApplet,
        totalStakeholders,
        completedCount,
        percentage,
        relevantMemberIds: relevantMembers?.map(m => m.user_id)
      });

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