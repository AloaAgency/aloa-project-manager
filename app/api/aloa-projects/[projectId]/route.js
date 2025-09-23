import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Get project details
    const { data: project, error } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {

      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const updates = await request.json();

    const { data: project, error } = await supabase
      .from('aloa_projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {

      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    // Automatically extract knowledge from the updated project
    try {
      const extractor = new KnowledgeExtractor(projectId);
      await extractor.extractFromProject(project);

    } catch (extractError) {

      // Don't fail the request if extraction fails
    }

    return NextResponse.json(project);

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;

    // Delete the project (cascade will handle related records)
    const { error } = await supabase
      .from('aloa_projects')
      .delete()
      .eq('id', projectId);

    if (error) {

      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}