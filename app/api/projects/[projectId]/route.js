import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAdminServiceRole,
} from '@/app/api/_utils/admin';

export async function DELETE(request, { params }) {
  try {
    const adminContext = await requireAdminServiceRole();
    if (adminContext.error) {
      return adminContext.error;
    }

    const { serviceSupabase } = adminContext;

    const { projectId } = params;

    // First, unassign all forms from this project (set them to uncategorized)
    const { error: updateError } = await serviceSupabase
      .from('aloa_forms')
      .update({
        aloa_project_id: null,
        project_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('aloa_project_id', projectId);

    if (updateError) {
      return handleSupabaseError(updateError, 'Failed to update forms');
    }

    const { error: legacyUpdateError } = await serviceSupabase
      .from('aloa_forms')
      .update({
        project_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId);

    if (legacyUpdateError) {
      return handleSupabaseError(legacyUpdateError, 'Failed to clear legacy form project references');
    }

    // Then delete the project
    const { error: deleteError } = await serviceSupabase
      .from('aloa_projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      return handleSupabaseError(deleteError, 'Failed to delete project');
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const adminContext = await requireAdminServiceRole();
    if (adminContext.error) {
      return adminContext.error;
    }

    const { serviceSupabase } = adminContext;

    const { projectId } = params;
    const body = await request.json();
    const { name, description } = body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await serviceSupabase
      .from('aloa_projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update project');
    }

    return NextResponse.json(data);
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
