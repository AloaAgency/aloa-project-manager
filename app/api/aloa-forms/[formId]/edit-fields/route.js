import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(request, { params }) {
  try {
    const { formId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to load user profile for form edit:', profileError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fields = [], title, description } = await request.json();

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data: form, error: formExistsError } = await supabase
      .from('aloa_forms')
      .select('id')
      .eq('id', formId)
      .maybeSingle();

    if (formExistsError) {
      console.error('Failed to load form for edit:', formExistsError);
      return NextResponse.json({ error: 'Failed to load form' }, { status: 500 });
    }

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { data: existingFieldRows, error: existingFieldsError } = await supabase
      .from('aloa_form_fields')
      .select('id')
      .eq('aloa_form_id', formId);

    if (existingFieldsError) {
      console.error('Failed to fetch existing form fields:', existingFieldsError);
      return NextResponse.json({ error: 'Failed to load existing fields' }, { status: 500 });
    }

    // Update form title and description
    const { error: formError } = await supabase
      .from('aloa_forms')
      .update({ 
        title, 
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId);

    if (formError) {
      console.error('Failed to update form metadata:', formError);
      return NextResponse.json(
        { error: 'Failed to update form' },
        { status: 500 }
      );
    }

    // Update fields
    for (const field of fields) {
      if (field.id) {
        // Update existing field
        const { error: fieldError } = await supabase
          .from('aloa_form_fields')
          .update({
            field_label: field.field_label,
            field_name: field.field_name,
            field_type: field.field_type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            validation: field.validation,
            field_order: field.field_order,
            help_text: field.help_text,
            default_value: field.default_value
          })
          .eq('id', field.id)
          .eq('aloa_form_id', formId);

        if (fieldError) {
          console.error('Failed to update form field:', field.id, fieldError);
          return NextResponse.json(
            { error: 'Failed to update form fields' },
            { status: 500 }
          );
        }
      } else {
        // Insert new field
        const { error: fieldError } = await supabase
          .from('aloa_form_fields')
          .insert({
            aloa_form_id: formId,
            field_label: field.field_label,
            field_name: field.field_name,
            field_type: field.field_type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            validation: field.validation,
            field_order: field.field_order,
            help_text: field.help_text,
            default_value: field.default_value
          });

        if (fieldError) {
          console.error('Failed to insert form field:', fieldError);
          return NextResponse.json(
            { error: 'Failed to add form fields' },
            { status: 500 }
          );
        }
      }
    }

    // Delete fields that were removed
    const existingFieldIds = (existingFieldRows || []).map(row => row.id);
    const idsToKeep = new Set(fields.filter(f => f.id).map(f => f.id));
    const idsToDelete = existingFieldIds.filter(id => !idsToKeep.has(id));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('aloa_form_fields')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Failed to delete removed form fields:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove deleted fields' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error updating form fields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
