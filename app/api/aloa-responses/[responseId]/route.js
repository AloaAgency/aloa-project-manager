import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { responseId } = params;

     if (!UUID_REGEX.test(responseId)) {
      return NextResponse.json({ error: 'Invalid response ID format' }, { status: 400 });
    }

    // Delete the response (answers will cascade delete)
    const { error } = await serviceSupabase
      .from('aloa_form_responses')
      .delete()
      .eq('id', responseId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete response');
    }

    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
