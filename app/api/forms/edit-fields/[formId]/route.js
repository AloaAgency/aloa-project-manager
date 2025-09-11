import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { fields, title, description } = await request.json();
    const { formId } = params;

    // Update form title and description if provided
    if (title !== undefined || description !== undefined) {
      const updateData = {
        // DO NOT update url_id - keep the existing URL stable
        updated_at: new Date().toISOString()
      };
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      
      const { error: formUpdateError } = await supabase
        .from('aloa_forms')
        .update(updateData)
        .eq('id', formId);
      
      if (formUpdateError) {
        console.error('Error updating form:', formUpdateError);
        return NextResponse.json(
          { error: 'Failed to update form' },
          { status: 500 }
        );
      }
    }

    // Get existing fields to determine which ones to delete
    const { data: existingFields, error: fetchError } = await supabase
      .from('aloa_form_fields')
      .select('id')
      .eq('form_id', formId);

    if (fetchError) {
      console.error('Error fetching existing fields:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing fields' },
        { status: 500 }
      );
    }

    // Find fields to delete (exist in DB but not in the updated list)
    const updatedFieldIds = fields.map(f => f.id);
    const fieldsToDelete = existingFields.filter(f => !updatedFieldIds.includes(f.id));

    // Delete removed fields
    if (fieldsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('aloa_form_fields')
        .delete()
        .in('id', fieldsToDelete.map(f => f.id));

      if (deleteError) {
        console.error('Error deleting fields:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete fields' },
          { status: 500 }
        );
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
        form_id: field.form_id,
        field_name: field.field_name,
        field_type: field.field_type,
        section: field.section,
        min: field.min,
        max: field.max,
        pattern: field.pattern
      };

      return supabase
        .from('aloa_form_fields')
        .update(safeUpdates)
        .eq('id', field.id)
        .eq('form_id', formId); // Extra safety check
    });

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Update errors:', errors);
      return NextResponse.json(
        { error: 'Failed to update some fields' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating form fields:', error);
    return NextResponse.json(
      { error: 'Failed to update form fields' },
      { status: 500 }
    );
  }
}