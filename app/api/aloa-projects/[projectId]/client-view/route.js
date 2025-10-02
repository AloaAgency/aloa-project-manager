import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['super_admin', 'project_admin'];

// GET project data for client view
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch projectlets with their applets
    const { data: projectlets, error: projectletsError } = await supabase
      .from('aloa_projectlets')
      .select(`
        *,
        applets:aloa_applets(
          id,
          projectlet_id,
          library_applet_id,
          name,
          description,
          type,
          access_type,
          order_index,
          config,
          form_id,
          upload_url,
          upload_file_urls,
          status,
          completion_percentage,
          requires_approval,
          approved_by,
          approved_at,
          revision_count,
          revision_notes,
          client_can_skip,
          client_instructions,
          internal_notes,
          completion_criteria,
          dependencies,
          started_at,
          completed_at,
          created_at,
          updated_at
        )
      `)
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (projectletsError) {
      return NextResponse.json({ error: 'Failed to fetch projectlets' }, { status: 500 });
    }

    // Sort applets within each projectlet by order_index
    const sortedProjectlets = projectlets?.map(projectlet => ({
      ...projectlet,
      applets: projectlet.applets?.sort((a, b) => a.order_index - b.order_index).map(applet => {
        // Debug log for Pig applet
        if (applet.name?.toLowerCase().includes('pig')) {
          // Log Pig applet configuration for debugging
        }
        return applet;
      }) || []
    })) || [];

    // Fetch user-specific progress for each applet
    const { data: userProgress, error: progressError } = await supabase
      .from('aloa_applet_progress')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (progressError) {
    }

    // User progress fetched for GET - processing palette progress

    // Create a map of user progress by applet ID
    const progressMap = {};
    userProgress?.forEach(progress => {
      progressMap[progress.applet_id] = progress;
    });

    // For each form applet, fetch the associated form details and apply user progress
    for (const projectlet of sortedProjectlets) {
      for (const applet of projectlet.applets) {
        // Apply user-specific progress
        const userAppletProgress = progressMap[applet.id];
        if (userAppletProgress) {
          applet.user_status = userAppletProgress.status;
          applet.user_completion_percentage = userAppletProgress.completion_percentage;
          applet.user_started_at = userAppletProgress.started_at;
          applet.user_completed_at = userAppletProgress.completed_at;
          applet.form_progress = userAppletProgress.form_progress;

          // Debug log for palette cleanser
          if (applet.type === 'palette_cleanser') {
            // Palette cleanser progress applied for debugging
          }
        } else {
          applet.user_status = 'not_started';
          applet.user_completion_percentage = 0;

          if (applet.type === 'palette_cleanser') {
          }
        }
        if (applet.type === 'form' && applet.form_id) {
          const { data: form } = await supabase
            .from('aloa_forms')
            .select(`
              id,
              title,
              description,
              url_id,
              status,
              sections,
              aloa_form_fields (
                id,
                field_label,
                field_name,
                field_type,
                required,
                placeholder,
                options,
                validation,
                field_order,
                help_text,
                default_value
              )
            `)
            .eq('id', applet.form_id)
            .single();

          if (form) {
            // Sort fields by order
            if (form.aloa_form_fields) {
              form.aloa_form_fields.sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
            }
            applet.form = form;
          }
        }

        // For AI Form Results applets, fetch the form title if not already in config
        if (applet.type === 'ai_form_results' && applet.config?.form_id) {
          // If form_title isn't already saved in config, fetch it
          if (!applet.config.form_title) {
            const { data: form } = await supabase
              .from('aloa_forms')
              .select('title')
              .eq('id', applet.config.form_id)
              .single();

            if (form) {
              // Update the config to include the form title for display
              applet.config.form_title = form.title;
            }
          }
        }
      }
    }

    // Debug: Log all projectlets and their status

    // For locked projectlets with no applets, estimate they will have at least 1 applet each
    // This ensures they're counted in the overall project scope
    const estimatedTotalApplets = sortedProjectlets.reduce((sum, p) => {
      if (p.status === 'locked' && p.applets.length === 0) {
        // Locked projectlet with no applets - count as having 1 future applet
        return sum + 1;
      }
      return sum + p.applets.length;
    }, 0);
    
    // Count completed applets - checking user_status which was set from progress data
    let completedCount = 0;
    sortedProjectlets.forEach(p => {
      p.applets.forEach(a => {
        if (a.user_status === 'completed' || a.user_status === 'approved') {
          completedCount++;
        } else {
        }
      });
    });
    const completedApplets = completedCount;
    
    // Calculate progress based on estimated total to include locked projectlets in scope
    const progressPercentage = estimatedTotalApplets > 0 ? Math.round((completedApplets / estimatedTotalApplets) * 100) : 0;
    
    
    // Also track projectlet completion for reference
    const totalProjectlets = sortedProjectlets.length;
    let completedProjectlets = 0;
    
    // A projectlet is considered complete if ALL its applets are completed or approved
    for (const projectlet of sortedProjectlets) {
      const allAppletsComplete = projectlet.applets.length > 0 && 
        projectlet.applets.every(applet => 
          applet.user_status === 'completed' || applet.user_status === 'approved'
        );
      
      if (allAppletsComplete) {
        completedProjectlets++;
      }
    }


    return NextResponse.json({ 
      project,
      projectlets: sortedProjectlets,
      stats: {
        totalApplets: estimatedTotalApplets,  // Use estimated total that includes locked projectlets
        completedApplets,
        progressPercentage
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST update applet status (client interaction)
export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {}
      }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('aloa_user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role ? ADMIN_ROLES.includes(profile.role) : false;

  try {
    const { projectId } = params;
    const payload = await request.json();
    const { appletId, status, interactionType, data } = payload || {};
    const requestedUserId = payload?.userId || payload?.user_id || null;

    if (!appletId || !interactionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let resolvedUserId = user.id;

    if (requestedUserId && requestedUserId !== 'anonymous') {
      if (!UUID_REGEX.test(requestedUserId)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      if (!isAdmin && requestedUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      resolvedUserId = requestedUserId;
    }

    let stakeholderImportance = 5;
    let stakeholderId = null;

    if (UUID_REGEX.test(resolvedUserId)) {
      const { data: stakeholder } = await supabase
        .from('aloa_project_stakeholders')
        .select('id, importance_score')
        .eq('user_id', resolvedUserId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (stakeholder) {
        stakeholderImportance = stakeholder.importance_score || 5;
        stakeholderId = stakeholder.id;
      }
    }

    const finalStatus =
      interactionType === 'palette_submit' || interactionType === 'submission'
        ? 'completed'
        : status;

    const completionPercentage =
      finalStatus === 'completed' ? 100 : status === 'in_progress' ? 50 : null;

    const { data: userProgress, error: progressError } = await supabase.rpc(
      'update_applet_progress',
      {
        p_applet_id: appletId,
        p_user_id: resolvedUserId,
        p_project_id: projectId,
        p_status: finalStatus,
        p_completion_percentage: completionPercentage,
        p_form_progress: data?.form_progress || null
      }
    );

    if (progressError) {
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    if (finalStatus === 'completed' && userProgress && !userProgress.completed_at) {
      const { data: directUpdate, error: directError } = await supabase
        .from('aloa_applet_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_percentage: 100,
          updated_at: new Date().toISOString(),
          stakeholder_importance: stakeholderImportance,
          stakeholder_id: stakeholderId
        })
        .eq('applet_id', appletId)
        .eq('user_id', resolvedUserId)
        .select()
        .maybeSingle();

      if (!directError && directUpdate) {
        userProgress.completed_at = directUpdate.completed_at;
      }
    }

    if (interactionType === 'form_submit' && status === 'completed') {
      const { data: applet } = await supabase
        .from('aloa_applets')
        .select('type, form_id, status')
        .eq('id', appletId)
        .maybeSingle();

      if (applet?.type === 'form' && applet?.form_id) {
        const { data: form } = await supabase
          .from('aloa_forms')
          .select('status')
          .eq('id', applet.form_id)
          .maybeSingle();

        const newStatus = form?.status === 'closed' ? 'completed' : 'in_progress';
        const updateData = {
          status: newStatus,
          completion_percentage: newStatus === 'completed' ? 100 : 50,
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        };

        await supabase
          .from('aloa_applets')
          .update(updateData)
          .eq('id', appletId);
      }
    } else if (status === 'completed' && interactionType !== 'form_submit') {
      const updateData = {
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString()
      };

      await supabase
        .from('aloa_applets')
        .update(updateData)
        .eq('id', appletId);
    }

    const interactionData = data ? { ...data } : {};
    if (interactionData.form_progress && typeof interactionData.form_progress === 'object') {
      interactionData.form_progress = {
        ...interactionData.form_progress,
        userId: resolvedUserId,
        stakeholderImportance
      };
    }

    const { data: interactionRecord } = await supabase
      .from('aloa_applet_interactions')
      .insert([
        {
          applet_id: appletId,
          project_id: projectId,
          interaction_type: interactionType,
          user_role: 'client',
          user_id: resolvedUserId,
          stakeholder_importance: stakeholderImportance,
          stakeholder_id: stakeholderId,
          data: interactionData
        }
      ])
      .select()
      .maybeSingle();

    if (interactionRecord) {
      const shouldExtract =
        status === 'completed' ||
        interactionType === 'form_submit' ||
        interactionType === 'phase_review_submission';

      if (shouldExtract) {
        let extractionTriggered = false;

        try {
          const response = await fetch(
            `${request.nextUrl.origin}/api/project-knowledge/${projectId}/extract`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceType: 'applet_interaction',
                sourceId: interactionRecord.id,
                triggerType: 'applet_completion'
              })
            }
          );

          extractionTriggered = response.ok;
        } catch (extractError) {
          extractionTriggered = false;
        }

        if (!extractionTriggered) {
          try {
            const extractor = new KnowledgeExtractor(projectId);
            await extractor.extractFromAppletInteraction(interactionRecord.id);
          } catch (fallbackError) {
            // Fallback extraction failed; suppress to avoid surfacing to client
          }
        }
      }
    }

    if (status === 'completed') {
      const { data: applet } = await supabase
        .from('aloa_applets')
        .select('projectlet_id')
        .eq('id', appletId)
        .maybeSingle();

      if (applet?.projectlet_id) {
        const { data: projectletApplets } = await supabase
          .from('aloa_applets')
          .select('status')
          .eq('projectlet_id', applet.projectlet_id);

        const allCompleted = projectletApplets?.every(
          (a) => a.status === 'completed' || a.status === 'approved'
        ) || false;

        if (allCompleted) {
          await supabase
            .from('aloa_projectlets')
            .update({ status: 'completed' })
            .eq('id', applet.projectlet_id);
        }
      }
    }

    if (finalStatus === 'completed') {
      await new Promise(resolve => setTimeout(resolve, 200));

      await supabase
        .from('aloa_applet_progress')
        .select('status, completed_at')
        .eq('applet_id', appletId)
        .eq('user_id', resolvedUserId)
        .maybeSingle();
    }

    return NextResponse.json({
      success: true,
      progress: userProgress
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
