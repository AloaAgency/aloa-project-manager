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
        knowledge_updated_at
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
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
      console.error('Error fetching knowledge:', knowledgeError);
    }

    // Get insights
    const { data: insights, error: insightsError } = await supabase
      .from('aloa_project_insights')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .order('confidence', { ascending: false });

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
    }

    // Get stakeholders
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('aloa_client_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('importance_score', { ascending: false })
      .order('is_primary', { ascending: false });

    if (stakeholdersError) {
      console.error('Error fetching stakeholders:', stakeholdersError);
    }

    return NextResponse.json({
      project: project || {},
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
    console.error('Error in knowledge route:', error);
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
      console.error('Error creating knowledge:', error);
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
    console.error('Error creating knowledge:', error);
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

    console.log('PATCH knowledge base - received body:', JSON.stringify(body, null, 2));
    console.log('PATCH knowledge base - projectId:', projectId);

    // Create service client that bypasses RLS
    let supabase;
    try {
      supabase = createServiceClient();
      console.log('Service client created successfully');
    } catch (clientError) {
      console.error('Failed to create service client:', clientError);
      return NextResponse.json(
        { error: 'Failed to initialize database client' },
        { status: 500 }
      );
    }

    const updateData = {};
    if (body.existing_url !== undefined) updateData.existing_url = body.existing_url;
    if (body.google_drive_url !== undefined) updateData.google_drive_url = body.google_drive_url;
    if (body.base_knowledge !== undefined) updateData.base_knowledge = body.base_knowledge;

    console.log('PATCH knowledge base - updateData:', JSON.stringify(updateData, null, 2));

    // First verify the project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('aloa_projects')
      .select('id, project_name, existing_url, google_drive_url, base_knowledge')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      console.error('Error fetching project:', fetchError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('Found project:', existingProject?.project_name);

    // Now perform the update
    const { data: project, error } = await supabase
      .from('aloa_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project knowledge - full details:');
      console.error('Error object:', JSON.stringify(error, null, 2));
      console.error('Update data was:', JSON.stringify(updateData, null, 2));
      console.error('Project ID was:', projectId);
      return NextResponse.json(
        { error: error.message || 'Failed to update project knowledge' },
        { status: 500 }
      );
    }

    // Trigger knowledge extraction if content changed
    const hasContentChanges =
      updateData.existing_url !== undefined ||
      updateData.google_drive_url !== undefined ||
      updateData.base_knowledge !== undefined;

    if (hasContentChanges) {
      console.log('Triggering knowledge extraction for changed content');

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
    }

    return NextResponse.json({
      success: true,
      project,
      knowledgeExtracted: hasContentChanges
    });

  } catch (error) {
    console.error('Error in PATCH handler:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
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
      console.error('Error deleting knowledge:', error);
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
    console.error('Error deleting knowledge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}