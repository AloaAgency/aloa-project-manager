import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    if (appletId) {
      // Get completion data for a specific applet from aloa_applet_progress
      // Include both completed AND in_progress to show dotted avatars
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
        .in('status', ['completed', 'in_progress']);

      if (completionsError) {

        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      // Get user profiles for the completions
      // user_id can be either a UUID or an email, so we need to handle both
      const userIds = completions.map(c => c.user_id);

      // Separate UUIDs and emails
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuids = userIds.filter(id => uuidPattern.test(id));
      const emails = userIds.filter(id => !uuidPattern.test(id) && id.includes('@'));

      // Fetch profiles by ID and by email
      let profiles = [];

      if (uuids.length > 0) {
        const { data: profilesByIds, error: idError } = await supabase
          .from('aloa_user_profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', uuids);

        if (!idError && profilesByIds) {
          profiles = [...profiles, ...profilesByIds];
        }
      }

      if (emails.length > 0) {
        const { data: profilesByEmails, error: emailError } = await supabase
          .from('aloa_user_profiles')
          .select('id, full_name, email, avatar_url')
          .in('email', emails);

        if (!emailError && profilesByEmails) {
          profiles = [...profiles, ...profilesByEmails];
        }
      }

      // For palette cleanser applets, fetch the interaction data
      let completionsWithProfiles = [];

      // Check if this is a palette cleanser applet
      const { data: appletData, error: appletError } = await supabase
        .from('aloa_applets')
        .select('type, name')
        .eq('id', appletId)
        .single();

      if (appletError) {
        return NextResponse.json({ error: 'Failed to fetch applet data' }, { status: 500 });
      }

      // Check both type and name for palette cleanser identification
      const isPaletteCleanser = appletData?.type === 'palette_cleanser' ||
                                appletData?.name?.toLowerCase().includes('palette');

      if (isPaletteCleanser) {
        // Fetch palette interaction data for each completion
        completionsWithProfiles = await Promise.all(completions.map(async (completion) => {
          // Find profile by ID or email
          const profile = profiles?.find(p =>
            p.id === completion.user_id || p.email === completion.user_id
          ) || {};

          // Fetch the palette interaction data
          // Note: The table uses user_email, not user_id, so we need to match by email
          // If user_id is already an email, use that; otherwise use profile.email
          const userEmail = completion.user_id.includes('@') ? completion.user_id : profile.email;
          const { data: interactions, error: interactionError } = await supabase
            .from('aloa_applet_interactions')
            .select('*')
            .eq('user_email', userEmail)
            .eq('applet_id', appletId)
            .eq('interaction_type', 'submission')
            .order('created_at', { ascending: false })
            .limit(1);

          if (interactionError) {
            // Handle interaction error
          }

          const paletteData = interactions?.[0]?.data || {};

          return {
            ...completion,
            data: paletteData,
            user: {
              id: completion.user_id,
              email: profile.email || completion.user_id,
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url
            }
          };
        }));
      } else {
        // For other applet types, merge profile data normally
        completionsWithProfiles = completions.map(completion => {
          // Find profile by ID or email
          const profile = profiles?.find(p =>
            p.id === completion.user_id || p.email === completion.user_id
          ) || {};
          return {
            ...completion,
            user: {
              id: completion.user_id,
              email: profile.email || completion.user_id,
              full_name: profile.full_name || 'Unknown User',
              avatar_url: profile.avatar_url
            }
          };
        });
      }

      // Check if this applet type requires Client Admin only (decision applets)
      const decisionAppletTypes = ['client_review', 'review', 'signoff', 'sitemap', 'sitemap_builder'];
      const isDecisionApplet = decisionAppletTypes.includes(appletData?.type);

      // Get client stakeholders for completion tracking
      // For decision applets, only count Client Admin stakeholders
      let stakeholdersQuery = supabase
        .from('aloa_client_stakeholders')
        .select('*')
        .eq('project_id', projectId);

      if (isDecisionApplet) {
        stakeholdersQuery = stakeholdersQuery.eq('role', 'client_admin');
      }

      const { data: stakeholders, error: stakeholdersError } = await stakeholdersQuery;

      // Count unique stakeholders (filtered appropriately for applet type)
      const totalStakeholders = stakeholders?.length || 0;
      // Only count completed ones for the percentage, not in_progress
      const completedCount = completions?.filter(c => c.status === 'completed').length || 0;
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

        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      return NextResponse.json(completions || []);
    }
  } catch (error) {

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

      return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 });
    }

    return NextResponse.json(completion);
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}