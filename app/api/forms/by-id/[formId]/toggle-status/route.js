import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function PATCH(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formId } = params;
    const { is_active, closed_message } = await request.json();

    // Update form status
    const updateData = {
      is_active: is_active,
      updated_at: new Date().toISOString()
    };

    // Optionally update the closed message
    if (closed_message !== undefined) {
      updateData.closed_message = closed_message;
    }

    const { data, error } = await serviceSupabase
      .from('aloa_forms')
      .update(updateData)
      .eq('id', formId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update form status');
    }

    return NextResponse.json({
      success: true,
      form: data,
      message: is_active ? 'Form reopened successfully' : 'Form closed successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to toggle form status' },
      { status: 500 }
    );
  }
}
