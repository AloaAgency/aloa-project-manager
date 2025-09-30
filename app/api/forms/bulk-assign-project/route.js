import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function PATCH(request) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formIds, projectId } = await request.json();

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json(
        { error: 'Form IDs are required' },
        { status: 400 }
      );
    }

    // Update all specified forms with the new project_id
    // This does NOT change the url_id, so public URLs remain the same
    const { data, error } = await serviceSupabase
      .from('aloa_forms')
      .update({ 
        project_id: projectId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', formIds);

    if (error) {
      return handleSupabaseError(error, 'Failed to update forms');
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${formIds.length} form(s)` 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to bulk assign project' },
      { status: 500 }
    );
  }
}
