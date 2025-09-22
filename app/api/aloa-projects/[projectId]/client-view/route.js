import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET project data for client view
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    
    console.log(`Fetching client view for project: ${projectId}, user: ${userId}`);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
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
      console.error('Error fetching projectlets:', projectletsError);
      return NextResponse.json({ error: 'Failed to fetch projectlets' }, { status: 500 });
    }

    // Sort applets within each projectlet by order_index
    const sortedProjectlets = projectlets?.map(projectlet => ({
      ...projectlet,
      applets: projectlet.applets?.sort((a, b) => a.order_index - b.order_index).map(applet => {
        // Debug log for Pig applet
        if (applet.name?.toLowerCase().includes('pig')) {
          console.log('Server - Pig applet config:', {
            id: applet.id,
            name: applet.name,
            config: applet.config,
            configType: typeof applet.config,
            configFiles: applet.config?.files,
            configFilesType: typeof applet.config?.files
          });
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
      console.error('Error fetching user progress:', progressError);
    }

    console.log('User progress fetched for GET:', {
      userId,
      projectId,
      count: userProgress?.length,
      paletteProgress: userProgress?.filter(p => {
        const applet = sortedProjectlets.flatMap(pl => pl.applets).find(a => a.id === p.applet_id);
        return applet?.type === 'palette_cleanser';
      }).map(p => ({
        appletId: p.applet_id,
        status: p.status,
        completed_at: p.completed_at
      }))
    });

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
            console.log('Palette cleanser progress applied:', {
              appletId: applet.id,
              name: applet.name,
              progressStatus: userAppletProgress.status,
              progressCompletedAt: userAppletProgress.completed_at,
              appliedUserStatus: applet.user_status,
              appliedUserCompletedAt: applet.user_completed_at
            });
          }
        } else {
          applet.user_status = 'not_started';
          applet.user_completion_percentage = 0;

          if (applet.type === 'palette_cleanser') {
            console.log('No progress found for palette cleanser:', applet.id);
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
    console.log('All projectlets:', sortedProjectlets.map(p => ({
      name: p.name,
      status: p.status,
      appletCount: p.applets.length,
      applets: p.applets.map(a => ({
        name: a.name,
        user_status: a.user_status,
        type: a.type
      }))
    })));

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
          console.log(`Counting as completed: ${a.name} (status: ${a.user_status})`);
        } else {
          console.log(`Not completed: ${a.name} (status: ${a.user_status})`);
        }
      });
    });
    const completedApplets = completedCount;
    
    // Calculate progress based on estimated total to include locked projectlets in scope
    const progressPercentage = estimatedTotalApplets > 0 ? Math.round((completedApplets / estimatedTotalApplets) * 100) : 0;
    
    console.log(`Calculation Debug - Total Projectlets: ${sortedProjectlets.length} (${sortedProjectlets.filter(p => p.status === 'locked').length} locked), Estimated Total Applets: ${estimatedTotalApplets}, Completed: ${completedApplets}, Percentage: ${progressPercentage}%`);
    
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

    console.log(`Client view data - Applets: ${completedApplets}/${estimatedTotalApplets} (${progressPercentage}%), Projectlets: ${completedProjectlets}/${totalProjectlets}`);

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
    console.error('Error in client-view route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST update applet status (client interaction)
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { appletId, status, interactionType, data, userId = 'anonymous' } = await request.json();

    console.log(`Client interaction - Project: ${projectId}, Applet: ${appletId}, User: ${userId}, Type: ${interactionType}, Status: ${status}`);

    // For palette_submit, ensure we're marking as completed
    const finalStatus = (interactionType === 'palette_submit' || interactionType === 'submission') ? 'completed' : status;
    const completionPercentage = finalStatus === 'completed' ? 100 : (status === 'in_progress' ? 50 : null);

    console.log(`Updating progress with: status=${finalStatus}, completion=${completionPercentage}`);

    // Update user-specific applet progress
    console.log('Calling update_applet_progress with:', {
      p_applet_id: appletId,
      p_user_id: userId,
      p_project_id: projectId,
      p_status: finalStatus,
      p_completion_percentage: completionPercentage
    });

    const { data: userProgress, error: progressError } = await supabase
      .rpc('update_applet_progress', {
        p_applet_id: appletId,
        p_user_id: userId,
        p_project_id: projectId,
        p_status: finalStatus,
        p_completion_percentage: completionPercentage,
        p_form_progress: data?.form_progress || null
      });

    console.log('RPC response:', { userProgress, progressError });

    if (progressError) {
      console.error('Error updating user progress:', progressError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    // Verify the update actually happened
    if (finalStatus === 'completed' && userProgress) {
      if (!userProgress.completed_at) {
        console.warn('WARNING: RPC returned but completed_at is null!');
        // Try to update directly as a fallback
        const { data: directUpdate, error: directError } = await supabase
          .from('aloa_applet_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completion_percentage: 100,
            updated_at: new Date().toISOString()
          })
          .eq('applet_id', appletId)
          .eq('user_id', userId)
          .select()
          .single();

        if (directError) {
          console.error('Direct update also failed:', directError);
        } else {
          console.log('Direct update succeeded:', directUpdate);
          userProgress.completed_at = directUpdate.completed_at;
        }
      }
    }

    console.log('User progress updated successfully:', {
      userProgress,
      status: finalStatus,
      completion: completionPercentage,
      appletId,
      userId,
      completed_at: userProgress?.completed_at
    });

    // For form applets, update status based on form state
    if (interactionType === 'form_submit' && status === 'completed') {
      // Get the applet details to check if it's a form type
      const { data: applet } = await supabase
        .from('aloa_applets')
        .select('type, form_id, status')
        .eq('id', appletId)
        .single();
      
      if (applet?.type === 'form' && applet?.form_id) {
        // Check if the form is locked/closed
        const { data: form } = await supabase
          .from('aloa_forms')
          .select('status')
          .eq('id', applet.form_id)
          .single();
        
        // If form is locked (status = 'closed'), mark applet as completed
        // Otherwise, mark as in_progress (has responses but still accepting)
        const newStatus = form?.status === 'closed' ? 'completed' : 'in_progress';
        const updateData = { 
          status: newStatus,
          completion_percentage: newStatus === 'completed' ? 100 : 50,
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        };
        
        const { error: appletError } = await supabase
          .from('aloa_applets')
          .update(updateData)
          .eq('id', appletId);
        
        if (appletError) {
          console.error('Error updating applet status:', appletError);
        }
      }
    } else if (status === 'completed' && interactionType !== 'form_submit') {
      // For non-form applets, mark as completed immediately
      const updateData = { 
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString()
      };
      
      const { error: appletError } = await supabase
        .from('aloa_applets')
        .update(updateData)
        .eq('id', appletId);
      
      if (appletError) {
        console.error('Error updating applet default status:', appletError);
      }
    }

    // Record the interaction
    const { data: interactionRecord, error: interactionError } = await supabase
      .from('aloa_applet_interactions')
      .insert([{
        applet_id: appletId,
        project_id: projectId,
        interaction_type: interactionType,
        user_role: 'client',
        data: data || {}
      }])
      .select()
      .single();

    if (interactionError) {
      console.error('Error recording interaction:', interactionError);
      // Don't fail the request if interaction logging fails
    } else if (interactionRecord) {
      // Trigger knowledge extraction for completed interactions
      if (status === 'completed' || interactionType === 'form_submit') {
        try {
          await fetch(`${request.nextUrl.origin}/api/project-knowledge/${projectId}/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: 'applet_interaction',
              sourceId: interactionRecord.id,
              triggerType: 'applet_completion'
            })
          });
        } catch (extractError) {
          console.error('Error triggering knowledge extraction:', extractError);
          // Don't fail the request if extraction fails
        }
      }
    }

    // If this was a completion, check if all applets in the projectlet are complete
    if (status === 'completed') {
      // Get the projectlet this applet belongs to
      const { data: applet } = await supabase
        .from('aloa_applets')
        .select('projectlet_id')
        .eq('id', appletId)
        .single();

      if (applet?.projectlet_id) {
        // Check if all applets in this projectlet are completed
        const { data: projectletApplets } = await supabase
          .from('aloa_applets')
          .select('status')
          .eq('projectlet_id', applet.projectlet_id);

        const allCompleted = projectletApplets?.every(a => 
          a.status === 'completed' || a.status === 'approved'
        );

        if (allCompleted) {
          // Update projectlet status to completed
          await supabase
            .from('aloa_projectlets')
            .update({ status: 'completed' })
            .eq('id', applet.projectlet_id);
          
          console.log(`Projectlet ${applet.projectlet_id} marked as completed`);
        }
      }
    }

    // If this was a completion, verify it was saved
    if (finalStatus === 'completed') {
      // Wait a moment for database to commit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify the update
      const { data: verifyData } = await supabase
        .from('aloa_applet_progress')
        .select('status, completed_at')
        .eq('applet_id', appletId)
        .eq('user_id', userId)
        .single();

      console.log('Verification after update:', {
        appletId,
        userId,
        savedStatus: verifyData?.status,
        savedCompletedAt: verifyData?.completed_at
      });
    }

    return NextResponse.json({
      success: true,
      progress: userProgress
    });
  } catch (error) {
    console.error('Error in client interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}