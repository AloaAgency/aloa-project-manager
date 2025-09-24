import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { pages, templateId, includeSubpages } = await request.json();

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json({ error: 'Invalid pages data' }, { status: 400 });
    }

    // Get the project details
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the current max order for projectlets in this project
    const { data: existingProjectlets } = await supabase
      .from('aloa_projectlets')
      .select('order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })
      .limit(1);

    let currentOrder = existingProjectlets?.[0]?.order_index || 0;

    // If a template is specified, fetch it
    let templateData = null;
    if (templateId) {

      const { data: template, error: templateError } = await supabase
        .from('aloa_projectlet_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!templateError && template) {
        templateData = template;
        const appletCount = template.template_data?.applets?.length || 0;

      } else {

      }
    }

    // Create projectlets for each page
    const createdProjectlets = [];

    // Extract template applets once, before the loop
    const templateApplets = templateData?.template_data?.applets || [];

    if (templateId && templateApplets.length === 0) {
      // Template has no applets to process
    }

    for (const page of pages) {
      currentOrder++;

      // Create the projectlet
      const projectletData = {
        project_id: projectId,
        name: page.name,
        description: `${page.type === 'footer' ? 'Footer page' : 'Main page'} for ${page.name}`,
        type: 'design',  // Required field
        status: 'locked',
        order_index: currentOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProjectlet, error: projectletError } = await supabase
        .from('aloa_projectlets')
        .insert([projectletData])
        .select()
        .single();

      if (projectletError) {

        continue;
      }

      createdProjectlets.push(newProjectlet);

      if (templateData && templateApplets.length > 0) {

        const appletsToCreate = templateApplets.map(templateApplet => ({
          projectlet_id: newProjectlet.id,
          type: templateApplet.type,
          name: templateApplet.name,
          description: templateApplet.description,
          config: templateApplet.configuration || templateApplet.config || {},
          order_index: templateApplet.order_index || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        if (appletsToCreate.length > 0) {
          const { error: appletsError } = await supabase
            .from('aloa_applets')
            .insert(appletsToCreate);

          if (appletsError) {

          }
        }
      }

      // If includeSubpages is true and this page has children, create projectlets for them too
      if (includeSubpages && page.children && page.children.length > 0) {
        for (const subpage of page.children) {
          currentOrder++;

          const subProjectletData = {
            project_id: projectId,
            name: `${page.name} - ${subpage.name}`,
            description: `Subpage of ${page.name}`,
            type: 'design',  // Required field
            status: 'locked',
            order_index: currentOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newSubProjectlet, error: subProjectletError } = await supabase
            .from('aloa_projectlets')
            .insert([subProjectletData])
            .select()
            .single();

          if (!subProjectletError) {
            createdProjectlets.push(newSubProjectlet);

            // Apply template to subpage projectlet if available
            if (templateData && templateApplets.length > 0) {

              const subAppletsToCreate = templateApplets.map(templateApplet => ({
                projectlet_id: newSubProjectlet.id,
                type: templateApplet.type,
                name: templateApplet.name,
                description: templateApplet.description,
                config: templateApplet.configuration || templateApplet.config || {},
                order_index: templateApplet.order_index || 0,
                      created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }));

              if (subAppletsToCreate.length > 0) {
                const { error: subAppletsError } = await supabase
                  .from('aloa_applets')
                  .insert(subAppletsToCreate);

                if (subAppletsError) {

                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: createdProjectlets.length,
      projectlets: createdProjectlets
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}