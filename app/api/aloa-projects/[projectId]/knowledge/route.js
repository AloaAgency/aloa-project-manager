import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET project knowledge
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

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
      .order('importance', { ascending: false })
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
      .order('importance', { ascending: false })
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
        importance: importance || 5,
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

    // Trigger context update
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

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

    const updateData = {};
    if (body.existing_url !== undefined) updateData.existing_url = body.existing_url;
    if (body.google_drive_url !== undefined) updateData.google_drive_url = body.google_drive_url;
    if (body.base_knowledge !== undefined) updateData.base_knowledge = body.base_knowledge;

    const { data: project, error } = await supabase
      .from('aloa_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project knowledge:', error);
      return NextResponse.json(
        { error: 'Failed to update project knowledge' },
        { status: 500 }
      );
    }

    // Trigger context update
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('Error updating knowledge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Trigger context update
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

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