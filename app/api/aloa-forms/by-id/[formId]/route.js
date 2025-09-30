import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function DELETE(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formId } = params;

    // Check if it's an aloa form (check this first since we're using aloa_forms primarily)
    const { data: aloaForm, error: aloaLookupError } = await serviceSupabase
      .from('aloa_forms')
      .select('id')
      .eq('id', formId)
      .maybeSingle();

    if (aloaLookupError) {
      console.error('Error looking up aloa form:', aloaLookupError);
      return handleSupabaseError(aloaLookupError, 'Failed to verify form');
    }

    if (aloaForm) {
      // Delete aloa form responses
      const { error: responseError } = await serviceSupabase
        .from('aloa_form_responses')
        .delete()
        .eq('aloa_form_id', formId);

      if (responseError) {
        console.error('Error deleting responses:', responseError);
        return handleSupabaseError(responseError, 'Failed to delete form responses');
      }

      // Delete aloa form fields
      const { error: fieldsError } = await serviceSupabase
        .from('aloa_form_fields')
        .delete()
        .eq('aloa_form_id', formId);

      if (fieldsError) {
        console.error('Error deleting fields:', fieldsError);
        return handleSupabaseError(fieldsError, 'Failed to delete form fields');
      }

      // Delete the form itself
      const { error } = await serviceSupabase
        .from('aloa_forms')
        .delete()
        .eq('id', formId);

      if (error) {
        console.error('Error deleting form:', error);
        return handleSupabaseError(error, 'Failed to delete form');
      }

      return NextResponse.json({ success: true, message: 'Form deleted successfully' });
    }

    // Try legacy form as fallback
    const { data: legacyForm, error: legacyLookupError } = await serviceSupabase
      .from('forms')
      .select('_id')
      .eq('_id', formId)
      .maybeSingle();

    if (legacyLookupError) {
      console.error('Error looking up legacy form:', legacyLookupError);
      // Don't fail here, just continue to "not found"
    }

    if (legacyForm) {
      // Delete legacy form responses
      const { error: responseError } = await serviceSupabase
        .from('responses')
        .delete()
        .eq('formId', formId);

      if (responseError) {
        console.error('Error deleting legacy responses:', responseError);
        return handleSupabaseError(responseError, 'Failed to delete legacy responses');
      }

      // Delete legacy form
      const { error } = await serviceSupabase
        .from('forms')
        .delete()
        .eq('_id', formId);

      if (error) {
        console.error('Error deleting legacy form:', error);
        return handleSupabaseError(error, 'Failed to delete legacy form');
      }

      return NextResponse.json({ success: true, message: 'Legacy form deleted successfully' });
    }

    return NextResponse.json(
      { error: 'Form not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}
