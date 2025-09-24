import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const cookieStore = await cookies();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    if (!body.templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('aloa_projectlet_templates')
      .select('*')
      .eq('id', body.templateId)
      .single();

    if (templateError || !template) {

      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if user has access to the template
    if (!template.is_public && template.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to use this template' }, { status: 403 });
    }

    // Get the current maximum order for existing projectlets
    // Try both column names for compatibility
    const { data: existingProjectlets } = await supabase
      .from('aloa_projectlets')
      .select('sequence_order, order_index')
      .eq('project_id', projectId)
      .limit(1);

    // Get the max order from whichever column exists
    let maxOrder = -1;
    if (existingProjectlets && existingProjectlets.length > 0) {
      const record = existingProjectlets[0];
      maxOrder = record.order_index ?? record.sequence_order ?? -1;
    }

    // Now get all projectlets to find the actual max
    const { data: allProjectlets } = await supabase
      .from('aloa_projectlets')
      .select('sequence_order, order_index')
      .eq('project_id', projectId);

    if (allProjectlets) {
      for (const p of allProjectlets) {
        const order = p.order_index ?? p.sequence_order ?? 0;
        if (order > maxOrder) maxOrder = order;
      }
    }

    let startingOrderIndex = maxOrder + 1;

    const templateData = template.template_data;
    const createdProjectlets = [];
    const createdApplets = [];

    if (templateData.type === 'single') {
      // Create a single projectlet
      const projectletData = templateData.projectlet;

      // Build the projectlet data, only including columns that exist
      const projectletToInsert = {
        project_id: projectId,
        name: projectletData.name || 'New Projectlet',
        type: 'design', // Use 'design' as default type (valid in database)
        order_index: startingOrderIndex
      };

      // Override type if it's a valid value
      if (projectletData.type === 'milestone' || projectletData.type === 'design') {
        projectletToInsert.type = projectletData.type;
      }

      // Add optional fields if they have values
      if (projectletData.description) {
        projectletToInsert.description = projectletData.description;
      }

      if (projectletData.status) {
        projectletToInsert.status = projectletData.status;
      }

      // Add sequence_order as well for compatibility
      projectletToInsert.sequence_order = startingOrderIndex;

      // Add color to metadata if it exists
      if (projectletData.color) {
        projectletToInsert.metadata = { color: projectletData.color };
      }

      const { data: newProjectlet, error: projectletError } = await supabase
        .from('aloa_projectlets')
        .insert(projectletToInsert)
        .select()
        .single();

      if (projectletError) {

        return NextResponse.json({ error: 'Failed to create projectlet: ' + projectletError.message }, { status: 500 });
      }

      createdProjectlets.push(newProjectlet);

      // Create applets for this projectlet
      if (templateData.applets && templateData.applets.length > 0) {
        const appletsToInsert = templateData.applets.map((applet, index) => {
          // Move is_locked into config if it exists
          const config = applet.config || {};
          if (applet.is_locked !== undefined) {
            config.locked = applet.is_locked;
          }
          return {
            projectlet_id: newProjectlet.id,
            type: applet.type,
            name: applet.name,
            config: config,
            order_index: index
          };
        });

        const { data: newApplets, error: appletsError } = await supabase
          .from('aloa_applets')
          .insert(appletsToInsert)
          .select();

        if (appletsError) {

          // Continue even if applets fail
        } else {
          createdApplets.push(...newApplets);
        }
      }
    } else {
      // Create multiple projectlets
      for (let i = 0; i < templateData.projectlets.length; i++) {
        const projectletData = templateData.projectlets[i];

        // Build the projectlet data, only including columns that exist
        const projectletToInsert = {
          project_id: projectId,
          name: projectletData.name || 'New Projectlet',
          type: 'design', // Use 'design' as default type (valid in database)
          order_index: startingOrderIndex + i
        };

        // Override type if it's a valid value
        if (projectletData.type === 'milestone' || projectletData.type === 'design') {
          projectletToInsert.type = projectletData.type;
        }

        // Add optional fields if they have values
        if (projectletData.description) {
          projectletToInsert.description = projectletData.description;
        }

        if (projectletData.status) {
          projectletToInsert.status = projectletData.status;
        }

        // Add sequence_order as well for compatibility
        projectletToInsert.sequence_order = startingOrderIndex + i;

        // Add color to metadata if it exists
        if (projectletData.color) {
          projectletToInsert.metadata = { color: projectletData.color };
        }

        const { data: newProjectlet, error: projectletError } = await supabase
          .from('aloa_projectlets')
          .insert(projectletToInsert)
          .select()
          .single();

        if (projectletError) {

          continue; // Skip to next projectlet
        }

        createdProjectlets.push(newProjectlet);

        // Create applets for this projectlet
        if (projectletData.applets && projectletData.applets.length > 0) {
          const appletsToInsert = projectletData.applets.map((applet, index) => {
            // Move is_locked into config if it exists
            const config = applet.config || {};
            if (applet.is_locked !== undefined) {
              config.locked = applet.is_locked;
            }
            return {
              projectlet_id: newProjectlet.id,
              type: applet.type,
              name: applet.name,
              config: config,
              order_index: index
            };
          });

          const { data: newApplets, error: appletsError } = await supabase
            .from('aloa_applets')
            .insert(appletsToInsert)
            .select();

          if (appletsError) {

            // Continue even if applets fail
          } else {
            createdApplets.push(...newApplets);
          }
        }
      }
    }

    // Log the template application in project timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: projectId,
        event_type: 'template_applied',
        event_data: {
          template_id: template.id,
          template_name: template.name,
          projectlets_created: createdProjectlets.length,
          applets_created: createdApplets.length
        },
        created_by: user.id
      });

    return NextResponse.json({
      success: true,
      message: `Template "${template.name}" applied successfully`,
      projectlets_created: createdProjectlets.length,
      applets_created: createdApplets.length,
      projectlets: createdProjectlets
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}