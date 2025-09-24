import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';

// GET project knowledge
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const supabase = createServiceClient();

    // Get project with knowledge base
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select(`
        existing_url,
        google_drive_url,
        base_knowledge,
        ai_context,
        knowledge_updated_at,
        metadata,
        client_references
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      );
    }

    // Get knowledge documents
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('aloa_project_knowledge')
      .select('*')
      .eq('project_id', projectId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (knowledgeError) {
      // Handle knowledge error - currently just continue
    }

    // Get insights
    const { data: insights, error: insightsError } = await supabase
      .from('aloa_project_insights')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .order('confidence', { ascending: false });

    if (insightsError) {
      // Handle insights error - currently just continue
    }

    // Get stakeholders
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('aloa_client_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('importance_score', { ascending: false })
      .order('is_primary', { ascending: false });

    if (stakeholdersError) {
      // Handle stakeholders error - currently just continue
    }

    // Extract brand_colors from metadata and add to project object
    const projectWithBrandColors = project ? {
      ...project,
      brand_colors: project.metadata?.brand_colors || [],
      client_references: project.client_references || []
    } : {};

    return NextResponse.json({
      project: projectWithBrandColors,
      knowledge: knowledge || [],
      insights: insights || [],
      stakeholders: stakeholders || [],
      stats: {
        totalDocuments: knowledge?.length || 0,
        totalInsights: insights?.length || 0,
        totalStakeholders: stakeholders?.length || 0,
        lastUpdated: project?.knowledge_updated_at
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add knowledge document
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const supabase = createServiceClient();

    const { type, title, content, file_url, external_url, metadata, importance } = body;

    // Create knowledge document
    const { data: knowledge, error } = await supabase
      .from('aloa_project_knowledge')
      .insert([{
        project_id: projectId,
        type,
        title,
        content,
        file_url,
        external_url,
        metadata: metadata || {},
        importance_score: importance || 5,
        source: 'manual',
        created_by: body.created_by || 'admin'
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create knowledge document' },
        { status: 500 }
      );
    }

    // Trigger context update (commented out as the RPC might not exist yet)
    // await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      knowledge
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update project knowledge base
export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    // Create service client that bypasses RLS
    let supabase;
    try {
      supabase = createServiceClient();

    } catch (clientError) {
      return NextResponse.json(
        { error: 'Failed to initialize database client' },
        { status: 500 }
      );
    }

    const updateData = {};
    if (body.existing_url !== undefined) updateData.existing_url = body.existing_url;
    if (body.google_drive_url !== undefined) updateData.google_drive_url = body.google_drive_url;
    if (body.base_knowledge !== undefined) updateData.base_knowledge = body.base_knowledge;
    if (body.client_references !== undefined) updateData.client_references = body.client_references;

    // Handle brand_colors by storing in metadata field
    if (body.brand_colors !== undefined) {
      // We'll handle metadata merging after we verify the project exists
      // For now just mark that we need to update brand_colors
      updateData.brand_colors = body.brand_colors;
    }

    // First verify the project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('aloa_projects')
      .select('id, project_name, existing_url, google_drive_url, base_knowledge, metadata, client_references')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // If we have brand_colors, merge them into metadata
    if (updateData.brand_colors !== undefined) {
      const brandColors = updateData.brand_colors;
      delete updateData.brand_colors; // Remove from updateData as it's not a direct field

      const currentMetadata = existingProject?.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        brand_colors: brandColors
      };
    }

    // Now perform the update
    const { data: project, error } = await supabase
      .from('aloa_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {

      return NextResponse.json(
        { error: error.message || 'Failed to update project knowledge' },
        { status: 500 }
      );
    }

    // Trigger knowledge extraction if content changed
    const hasContentChanges =
      updateData.existing_url !== undefined ||
      updateData.google_drive_url !== undefined ||
      updateData.base_knowledge !== undefined ||
      body.brand_colors !== undefined ||
      body.client_references !== undefined;

    if (hasContentChanges) {
      // Queue extraction for website URL if it was updated
      if (updateData.existing_url) {
        await supabase
          .from('aloa_knowledge_extraction_queue')
          .upsert([{
            project_id: projectId,
            source_type: 'website',
            source_id: updateData.existing_url,
            metadata: { url: updateData.existing_url },
            status: 'pending',
            priority: 10
          }], {
            onConflict: 'project_id,source_type,source_id'
          });
      }

      // Queue extraction for Google Drive if it was updated
      if (updateData.google_drive_url) {
        await supabase
          .from('aloa_knowledge_extraction_queue')
          .upsert([{
            project_id: projectId,
            source_type: 'google_drive',
            source_id: updateData.google_drive_url,
            metadata: { url: updateData.google_drive_url },
            status: 'pending',
            priority: 8
          }], {
            onConflict: 'project_id,source_type,source_id'
          });
      }

      // Store base knowledge directly if it was updated
      if (updateData.base_knowledge) {
        await supabase
          .from('aloa_project_knowledge')
          .upsert([{
            project_id: projectId,
            source_type: 'manual',
            source_id: 'base_knowledge',
            source_name: 'Base Project Knowledge',
            content_type: 'text',
            content: updateData.base_knowledge,
            content_summary: 'Manual project notes and context',
            category: 'project_overview',
            tags: ['manual', 'base_knowledge'],
            importance_score: 8,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            is_current: true
          }], {
            onConflict: 'project_id,source_type,source_id'
          });
      }

      // Store brand colors knowledge if updated
      if (body.brand_colors !== undefined) {
        const brandColorsContent = body.brand_colors.length > 0
          ? `Client's brand colors: ${body.brand_colors.join(', ')}`
          : 'No brand colors specified';

        await supabase
          .from('aloa_project_knowledge')
          .upsert([{
            project_id: projectId,
            source_type: 'manual',
            source_id: 'brand_colors',
            source_name: 'Brand Colors',
            content_type: 'preferences',
            content: brandColorsContent,
            content_summary: `Brand colors: ${body.brand_colors.join(', ') || 'None'}`,
            category: 'brand_identity',
            tags: ['manual', 'brand_colors', 'design'],
            importance_score: 9,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            is_current: true
          }], {
            onConflict: 'project_id,source_type,source_id'
          });
      }

      // Store client references knowledge if updated
      if (body.client_references !== undefined) {
        const referencesContent = body.client_references.length > 0
          ? body.client_references.map(ref => `- ${ref.name}: ${ref.url}`).join('\n')
          : 'No client references provided';

        await supabase
          .from('aloa_project_knowledge')
          .upsert([{
            project_id: projectId,
            source_type: 'manual',
            source_id: 'client_references',
            source_name: 'Client Reference Sites',
            content_type: 'references',
            content: referencesContent,
            content_summary: `Client reference websites: ${body.client_references.map(r => r.name).join(', ') || 'None'}`,
            category: 'inspiration',
            tags: ['manual', 'references', 'design', 'inspiration'],
            importance_score: 8,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            is_current: true
          }], {
            onConflict: 'project_id,source_type,source_id'
          });
      }
    }

    return NextResponse.json({
      success: true,
      project,
      knowledgeExtracted: hasContentChanges
    });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove knowledge document
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const knowledgeId = searchParams.get('knowledgeId');
    const supabase = createServiceClient();

    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('aloa_project_knowledge')
      .delete()
      .eq('id', knowledgeId)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete knowledge document' },
        { status: 500 }
      );
    }

    // Trigger context update (commented out as the RPC might not exist yet)
    // await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      message: 'Knowledge document deleted'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}