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

    // First check if the form exists
    const { data: form, error: fetchError } = await serviceSupabase
      .from('aloa_forms')
      .select('id, title')
      .eq('id', formId)
      .maybeSingle();

    if (fetchError) {
      return handleSupabaseError(fetchError, 'Failed to load form');
    }

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Delete the form (this will cascade delete related fields and responses)
    const { error: deleteError } = await serviceSupabase
      .from('aloa_forms')
      .delete()
      .eq('id', formId);

    if (deleteError) {
      return handleSupabaseError(deleteError, 'Failed to delete form');
    }

    return NextResponse.json({
      success: true,
      message: `Form "${form.title}" deleted successfully`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formId } = params;

    // Get form with all related data
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
          field_order,
          help_text,
          default_value
        ),
        aloa_form_responses (
          id,
          submitted_at
        )
      `)
      .eq('id', formId)
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch form');
    }

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Sort fields by order
    if (form.aloa_form_fields) {
      form.aloa_form_fields.sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
    }

    // Add response count
    form.response_count = form.aloa_form_responses?.length || 0;
    delete form.aloa_form_responses; // Remove raw responses from output

    return NextResponse.json(form);

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formId } = params;
    const updates = await request.json();

    // Update the form
    const { data: form, error } = await serviceSupabase
      .from('aloa_forms')
      .update(updates)
      .eq('id', formId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update form');
    }

    return NextResponse.json(form);

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
