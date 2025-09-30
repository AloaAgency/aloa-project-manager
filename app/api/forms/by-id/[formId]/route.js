import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    // Fetch form with its fields
    const { data: form, error } = await serviceSupabase
      .from('aloa_forms')
      .select(`
        *,
        aloa_form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order
        )
      `)
      .eq('id', params.formId)
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch form');
    }

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Sort fields by position and format response
    const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];

    // Format response for compatibility
    const response = NextResponse.json({
      ...form,
      _id: form.id,
      urlId: form.url_id,
      fields: sortedFields.map(field => ({
        ...field,
        _id: field.id,
        label: field.field_label, // Map field_label back to label for frontend
        name: field.field_name, // Map field_name back to name for frontend
        type: field.field_type, // Map field_type back to type for frontend
        position: field.field_order // Map field_order back to position for frontend
      })),
      createdAt: form.created_at,
      updatedAt: form.updated_at
    });

    // Add caching headers - form definitions rarely change, cache for 2 minutes
    response.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    // First delete all response answers for this form
    const { data: responses, error: responsesError } = await serviceSupabase
      .from('aloa_form_responses')
      .select('id')
      .eq('aloa_form_id', params.formId);

    if (responsesError) {
      return handleSupabaseError(responsesError, 'Failed to load form responses');
    }

    if (responses && responses.length > 0) {
      const responseIds = responses.map((r) => r.id);
      const { error: deleteAnswersError } = await serviceSupabase
        .from('aloa_form_response_answers')
        .delete()
        .in('response_id', responseIds);

      if (deleteAnswersError) {
        return handleSupabaseError(deleteAnswersError, 'Failed to delete response answers');
      }
    }

    // Delete all responses for this form
    const { error: deleteResponsesError } = await serviceSupabase
      .from('aloa_form_responses')
      .delete()
      .eq('aloa_form_id', params.formId);

    if (deleteResponsesError) {
      return handleSupabaseError(deleteResponsesError, 'Failed to delete responses');
    }

    // Delete all fields for this form
    const { error: deleteFieldsError } = await serviceSupabase
      .from('aloa_form_fields')
      .delete()
      .eq('aloa_form_id', params.formId);

    if (deleteFieldsError) {
      return handleSupabaseError(deleteFieldsError, 'Failed to delete form fields');
    }

    // Finally delete the form itself
    const { error } = await serviceSupabase
      .from('aloa_forms')
      .delete()
      .eq('id', params.formId);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete form');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}
