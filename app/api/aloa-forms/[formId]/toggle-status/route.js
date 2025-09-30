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
    const body = await request.json();

    // Update the form status - using 'status' field which exists in the database
    const newStatus = body.is_active === false ? 'closed' : 'active';
    const { data, error } = await serviceSupabase
      .from('aloa_forms')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update form status');
    }

    return NextResponse.json({
      success: true,
      form: data
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
