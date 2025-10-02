import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  hasProjectAccess,
  requireAuthenticatedSupabase,
  UUID_REGEX,
  validateUuid
} from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  try {
    const projectValidation = validateUuid(params.projectId, 'project ID');
    if (projectValidation) {
      return projectValidation;
    }

    const authContext = await requireAuthenticatedSupabase();
    if (authContext.error) {
      return authContext.error;
    }

    const { user, role, isAdmin } = authContext;
    const serviceSupabase = createServiceClient();
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    if (appletId && !UUID_REGEX.test(appletId)) {
      return NextResponse.json({ error: 'Invalid applet ID' }, { status: 400 });
    }

    const hasAccess = await hasProjectAccess(serviceSupabase, projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canViewPeerProgress = isAdmin || role === 'client_admin';
    if (!canViewPeerProgress) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dataClient = serviceSupabase;

    if (appletId) {
      // Get completion data for a specific applet from aloa_applet_progress
      // Include ALL records regardless of status to show all team members
      const { data: completions, error: completionsError } = await dataClient
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
        .eq('applet_id', appletId);
        // Removed status filter to get ALL records, even 'not_started'

      if (completionsError) {

        return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 });
      }

      const completionRows = Array.isArray(completions) ? completions : [];

      // Get user profiles for the completions
      // user_id can be either a UUID or an email, so we need to handle both
      const userIds = completionRows.map((c) => c.user_id).filter(Boolean);

      // Separate UUIDs and emails
      const uuids = userIds.filter(id => UUID_REGEX.test(id));
      const emails = userIds.filter(id => !UUID_REGEX.test(id) && typeof id === 'string' && id.includes('@'));

      // Fetch profiles by ID and by email
      let profiles = [];

      if (uuids.length > 0) {
        const { data: profilesByIds, error: idError } = await dataClient
          .from('aloa_user_profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', uuids);

        if (!idError && profilesByIds) {
          profiles = [...profiles, ...profilesByIds];
        }
      }

      if (emails.length > 0) {
        const { data: profilesByEmails, error: emailError } = await dataClient
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
      const { data: appletData, error: appletError } = await dataClient
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
        completionsWithProfiles = await Promise.all(completionRows.map(async (completion) => {
          // Find profile by ID or email
          const profile = profiles?.find(p =>
            p.id === completion.user_id || p.email === completion.user_id
          ) || {};

          // Fetch the palette interaction data
          // Note: The table uses user_email, not user_id, so we need to match by email
          // If user_id is already an email, use that; otherwise use profile.email
          const userEmail = typeof completion.user_id === 'string' && completion.user_id.includes('@')
            ? completion.user_id
            : profile.email;
          const { data: interactions, error: interactionError } = await dataClient
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
        completionsWithProfiles = completionRows.map((completion) => {
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
      let stakeholdersQuery = dataClient
        .from('aloa_client_stakeholders')
        .select('*')
        .eq('project_id', projectId);

      if (isDecisionApplet) {
        stakeholdersQuery = stakeholdersQuery.eq('role', 'client_admin');
      }

      const { data: stakeholders, error: stakeholdersError } = await stakeholdersQuery;

      if (!stakeholdersError && Array.isArray(stakeholders) && stakeholders.length > 0) {
        const stakeholderByUserId = new Map();
        const stakeholderByEmail = new Map();

        stakeholders.forEach((stakeholder) => {
          if (stakeholder?.user_id) {
            stakeholderByUserId.set(stakeholder.user_id, stakeholder);
          }

          if (stakeholder?.email) {
            stakeholderByEmail.set(stakeholder.email.toLowerCase(), stakeholder);
          }
        });

        completionsWithProfiles = completionsWithProfiles.map((completion) => {
          const completionEmail = completion?.user?.email || completion?.user_id;
          const normalizedEmail = typeof completionEmail === 'string' ? completionEmail.toLowerCase() : null;
          const stakeholderMatch = stakeholderByUserId.get(completion.user_id) ||
            (normalizedEmail ? stakeholderByEmail.get(normalizedEmail) : null);

          if (!stakeholderMatch) {
            return completion;
          }

          const baseUser = completion.user || {};
          const updatedUser = {
            ...baseUser,
            email: baseUser.email || stakeholderMatch.email || completionEmail || null,
            full_name: baseUser.full_name && baseUser.full_name !== 'Unknown User'
              ? baseUser.full_name
              : stakeholderMatch.name || baseUser.full_name || null,
            avatar_url: baseUser.avatar_url || stakeholderMatch.avatar_url || null,
          };

          return {
            ...completion,
            user: updatedUser,
          };
        });
      }

      // Count unique stakeholders (filtered appropriately for applet type)
      const totalStakeholders = stakeholders?.length || 0;
      // Only count completed ones for the percentage, not in_progress
      const completedCount = completionRows.filter((c) => c.status === 'completed').length || 0;
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
      const { data: completions, error } = await dataClient
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
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
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
