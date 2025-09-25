import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(request, { params }) {
  try {
    const { formId } = params;

    // First, check if it's a legacy form
    const { data: legacyForm } = await supabase
      .from('forms')
      .select('*')
      .eq('_id', formId)
      .single();

    if (legacyForm) {
      // Create duplicate of legacy form
      const newForm = {
        ...legacyForm,
        _id: nanoid(10),
        urlId: nanoid(10),
        title: `${legacyForm.title} (Copy)`,
        createdAt: new Date().toISOString()
      };

      delete newForm.id; // Remove any auto-generated ID

      const { data, error } = await supabase
        .from('forms')
        .insert([newForm])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Legacy form duplicated successfully',
        newFormId: data._id
      });
    }

    // Check if it's an aloa form
    const { data: aloaForm } = await supabase
      .from('aloa_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (aloaForm) {
      // Get the form fields
      const { data: fields } = await supabase
        .from('aloa_form_fields')
        .select('*')
        .eq('aloa_form_id', formId)
        .order('field_order');

      // Create duplicate form
      const newForm = {
        title: `${aloaForm.title} (Copy)`,
        description: aloaForm.description,
        url_id: nanoid(10),
        markdown_content: aloaForm.markdown_content,
        aloa_project_id: aloaForm.aloa_project_id,
        status: 'draft', // Set as draft by default
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data: createdForm, error: formError } = await supabase
        .from('aloa_forms')
        .insert([newForm])
        .select()
        .single();

      if (formError) throw formError;

      // Duplicate fields if they exist
      if (fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          aloa_form_id: createdForm.id,
          field_label: field.field_label,
          field_name: field.field_name,
          field_type: field.field_type,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
          validation: field.validation,
          field_order: field.field_order
        }));

        const { error: fieldsError } = await supabase
          .from('aloa_form_fields')
          .insert(newFields);

        if (fieldsError) {
          // Rollback by deleting the form
          await supabase.from('aloa_forms').delete().eq('id', createdForm.id);
          throw fieldsError;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Form duplicated successfully',
        newFormId: createdForm.id
      });
    }

    return NextResponse.json(
      { error: 'Form not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error duplicating form:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate form' },
      { status: 500 }
    );
  }
}