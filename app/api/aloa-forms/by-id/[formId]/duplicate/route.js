import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function POST(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { formId } = params;

    const { data: legacyForm, error: legacyLookupError } = await serviceSupabase
      .from('forms')
      .select('*')
      .eq('_id', formId)
      .maybeSingle();

    if (legacyLookupError) {
      return handleSupabaseError(legacyLookupError, 'Failed to check legacy form');
    }

    if (legacyForm) {
      const newForm = {
        ...legacyForm,
        _id: nanoid(10),
        urlId: nanoid(10),
        title: `${legacyForm.title} (Copy)`,
        createdAt: new Date().toISOString(),
      };

      delete newForm.id;

      const { data, error } = await serviceSupabase
        .from('forms')
        .insert([newForm])
        .select()
        .single();

      if (error) {
        return handleSupabaseError(error, 'Failed to create legacy form copy');
      }

      return NextResponse.json({
        success: true,
        message: 'Legacy form duplicated successfully',
        newFormId: data._id,
      });
    }

    const { data: aloaForm, error: aloaLookupError } = await serviceSupabase
      .from('aloa_forms')
      .select('*')
      .eq('id', formId)
      .maybeSingle();

    if (aloaLookupError) {
      return handleSupabaseError(aloaLookupError, 'Failed to load form');
    }

    if (!aloaForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { data: fields, error: fieldsLookupError } = await serviceSupabase
      .from('aloa_form_fields')
      .select('*')
      .eq('aloa_form_id', formId)
      .order('field_order');

    if (fieldsLookupError) {
      return handleSupabaseError(fieldsLookupError, 'Failed to load form fields');
    }

    const newForm = {
      title: `${aloaForm.title} (Copy)`,
      description: aloaForm.description,
      url_id: nanoid(10),
      markdown_content: aloaForm.markdown_content,
      aloa_project_id: aloaForm.aloa_project_id,
      status: 'draft',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data: createdForm, error: formError } = await serviceSupabase
      .from('aloa_forms')
      .insert([newForm])
      .select()
      .single();

    if (formError) {
      return handleSupabaseError(formError, 'Failed to duplicate form');
    }

    if (fields && fields.length > 0) {
      const newFields = fields.map((field) => ({
        aloa_form_id: createdForm.id,
        field_label: field.field_label,
        field_name: field.field_name,
        field_type: field.field_type,
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        validation: field.validation,
        field_order: field.field_order,
      }));

      const { error: fieldsError } = await serviceSupabase
        .from('aloa_form_fields')
        .insert(newFields);

      if (fieldsError) {
        await serviceSupabase.from('aloa_forms').delete().eq('id', createdForm.id);
        return handleSupabaseError(fieldsError, 'Failed to duplicate form fields');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Form duplicated successfully',
      newFormId: createdForm.id,
    });
  } catch (error) {
    console.error('Error duplicating form:', error);
    return NextResponse.json({ error: 'Failed to duplicate form' }, { status: 500 });
  }
}
