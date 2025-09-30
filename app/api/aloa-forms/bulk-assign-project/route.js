import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function PATCH(request) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const body = await request.json();
    const { formIds, projectId } = body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid form IDs' },
        { status: 400 }
      );
    }

    // Update all forms with the new project ID
    const { data, error } = await serviceSupabase
      .from('aloa_forms')
      .update({
        aloa_project_id: projectId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', formIds);

    if (error) {
      return handleSupabaseError(error, 'Failed to assign forms to project');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${formIds.length} form(s) to project`,
      updatedCount: formIds.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
