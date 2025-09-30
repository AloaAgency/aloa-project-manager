import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function PATCH(request, { params }) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { fields, title, description } = await request.json();
    const { formId } = params;

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Fields must be an array' }, { status: 400 });
    }

    // Update form title and description if provided
    if (title !== undefined || description !== undefined) {
      const updateData = {
        // DO NOT update url_id - keep the existing URL stable
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      const { error: formUpdateError } = await serviceSupabase
        .from('aloa_forms')
        .update(updateData)
        .eq('id', formId);

      if (formUpdateError) {
        return handleSupabaseError(formUpdateError, 'Failed to update form');
      }
    }

    // Get existing fields to determine which ones to delete
    const { data: existingFields, error: fetchError } = await serviceSupabase
      .from('aloa_form_fields')
      .select('id')
      .eq('aloa_form_id', formId);

    if (fetchError) {
      return handleSupabaseError(fetchError, 'Failed to fetch existing fields');
    }

    // Find fields to delete (exist in DB but not in the updated list)
    const updatedFieldIds = fields.map(f => f.id);
    const fieldsToDelete = existingFields.filter(f => !updatedFieldIds.includes(f.id));

    // Delete removed fields
    if (fieldsToDelete.length > 0) {
      const { error: deleteError } = await serviceSupabase
        .from('aloa_form_fields')
        .delete()
        .in('id', fieldsToDelete.map(f => f.id));

      if (deleteError) {
        return handleSupabaseError(deleteError, 'Failed to delete fields');
      }
    }

    // Update each field while preserving the ID and structure
    const updatePromises = fields.map((field, index) => {
      // Only update safe properties that won't break responses
      const safeUpdates = {
        field_label: field.field_label,
        placeholder: field.placeholder,
        options: field.options,
        required: field.required,
        field_order: index, // Use the array index as the new order
        // Preserve these critical fields
        id: field.id,
        field_name: field.field_name,
        field_type: field.field_type,
        section: field.section,
        min: field.min,
        max: field.max,
        pattern: field.pattern
      };

      return serviceSupabase
        .from('aloa_form_fields')
        .update(safeUpdates)
        .eq('id', field.id)
        .eq('aloa_form_id', formId); // Extra safety check
    });

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      const firstError = errors[0].error;
      return handleSupabaseError(firstError, 'Failed to update some fields');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update form fields' },
      { status: 500 }
    );
  }
}
