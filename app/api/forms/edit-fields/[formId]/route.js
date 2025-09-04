import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function PATCH(request, { params }) {
  try {
    const { fields, title } = await request.json();
    const { formId } = params;

    // Update form title and regenerate slug if provided
    if (title !== undefined) {
      // Generate a URL-friendly slug from the title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
        .trim();
      
      // Create a unique URL ID that combines the slug with a short random ID
      const url_id = `${slug}-${nanoid(6)}`;
      
      const { error: titleError } = await supabase
        .from('forms')
        .update({ 
          title,
          url_id, // Update the URL ID with the new slug
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