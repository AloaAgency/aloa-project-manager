import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;

    // First, unassign all forms from this project (set them to uncategorized)
    const { error: updateError } = await supabase
      .from('forms')
      .update({ project_id: null })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Error updating forms:', updateError);
      return NextResponse.json(
        { error: 'Failed to update forms' },
        { status: 500 }
      );
    }

    // Then delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { name, description } = body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}