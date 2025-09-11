import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { formId } = params;
    const { fields, title, description } = await request.json();

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
      console.error('Error updating form:', formError);
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
          .eq('id', field.id);

        if (fieldError) {
          console.error('Error updating field:', fieldError);
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
          console.error('Error inserting field:', fieldError);
        }
      }
    }

    // Delete fields that were removed
    const fieldIds = fields.filter(f => f.id).map(f => f.id);
    if (fieldIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('aloa_form_fields')
        .delete()
        .eq('aloa_form_id', formId)
        .not('id', 'in', `(${fieldIds.join(',')})`);

      if (deleteError) {
        console.error('Error deleting removed fields:', deleteError);
      }
    } else {
      // If no fields have IDs, delete all existing fields for this form
      const { error: deleteError } = await supabase
        .from('aloa_form_fields')
        .delete()
        .eq('aloa_form_id', formId);

      if (deleteError) {
        console.error('Error deleting all fields:', deleteError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in PATCH /api/aloa-forms/[formId]/edit-fields:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}