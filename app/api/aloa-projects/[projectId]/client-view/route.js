import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET project data for client view
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    
    console.log(`Fetching client view for project: ${projectId}`);

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
          *
        )
      `)
      .eq('project_id', projectId)
      .order('sequence_order', { ascending: true });

    if (projectletsError) {
      console.error('Error fetching projectlets:', projectletsError);
      return NextResponse.json({ error: 'Failed to fetch projectlets' }, { status: 500 });
    }

    // Sort applets within each projectlet by order_index
    const sortedProjectlets = projectlets?.map(projectlet => ({
      ...projectlet,
      applets: projectlet.applets?.sort((a, b) => a.order_index - b.order_index) || []
    })) || [];

    // For each form applet, fetch the associated form details
    for (const projectlet of sortedProjectlets) {
      for (const applet of projectlet.applets) {
        if (applet.type === 'form' && applet.form_id) {
          const { data: form } = await supabase
            .from('aloa_forms')
            .select(`
              id, 
              title, 
              description, 
              url_id,
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
      }
    }

    // Calculate overall project progress
    const totalApplets = sortedProjectlets.reduce((sum, p) => sum + p.applets.length, 0);
    const completedApplets = sortedProjectlets.reduce((sum, p) => 
      sum + p.applets.filter(a => a.status === 'completed' || a.status === 'approved').length, 0
    );
    const progressPercentage = totalApplets > 0 ? Math.round((completedApplets / totalApplets) * 100) : 0;

    console.log(`Client view data - Total applets: ${totalApplets}, Completed: ${completedApplets}, Progress: ${progressPercentage}%`);

    return NextResponse.json({ 
      project,
      projectlets: sortedProjectlets,
      stats: {
        totalApplets,
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
    const { appletId, status, interactionType, data } = await request.json();

    console.log(`Client interaction - Project: ${projectId}, Applet: ${appletId}, Type: ${interactionType}`);

    // Update applet status
    const updateData = { status };
    
    // Add timestamps based on status
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completion_percentage = 100;
    }

    const { data: updatedApplet, error: updateError } = await supabase
      .from('aloa_applets')
      .update(updateData)
      .eq('id', appletId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating applet:', updateError);
      return NextResponse.json({ error: 'Failed to update applet' }, { status: 500 });
    }

    // Record the interaction
    const { error: interactionError } = await supabase
      .from('aloa_applet_interactions')
      .insert([{
        applet_id: appletId,
        project_id: projectId,
        interaction_type: interactionType,
        user_role: 'client',
        data: data || {}
      }]);

    if (interactionError) {
      console.error('Error recording interaction:', interactionError);
      // Don't fail the request if interaction logging fails
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

    return NextResponse.json({ 
      success: true, 
      applet: updatedApplet 
    });
  } catch (error) {
    console.error('Error in client interaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}