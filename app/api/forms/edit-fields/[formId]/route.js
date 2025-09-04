import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { fields, title } = await request.json();
    const { formId } = params;

    // Update form title if provided
    if (title !== undefined) {
      const { error: titleError } = await supabase
        .from('forms')
        .update({ 
          title,
          // DO NOT update url_id - keep the existing URL stable
          updated_at: new Date().toISOString()
        })
        .eq('id', formId);
      
      if (titleError) {
        console.error('Error updating form title:', titleError);
        return NextResponse.json(
          { error: 'Failed to update form title' },
          { status: 500 }
        );
      }
    }

    // Update each field while preserving the ID and structure
    const updatePromises = fields.map(field => {
      // Only update safe properties that won't break responses
      const safeUpdates = {
        field_label: field.field_label,
        placeholder: field.placeholder,
        options: field.options,
        required: field.required,
        // Preserve these critical fields
        id: field.id,
        form_id: field.form_id,
        field_name: field.field_name,
        field_type: field.field_type,
        field_order: field.field_order,
        section: field.section,
        min: field.min,
        max: field.max,
        pattern: field.pattern
      };

      return supabase
        .from('form_fields')
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