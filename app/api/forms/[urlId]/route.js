import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    // Fetch form with its fields
    const { data: form, error } = await supabase
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
      .eq('url_id', params.urlId)
      .single();
    
    if (error || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }
    
    // Sort fields by position and format response
    const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];
    
    // Format response for compatibility
    return NextResponse.json({
      ...form,
      _id: form.id,
      urlId: form.url_id,
      fields: sortedFields.map(field => ({
        _id: field.id,
        label: field.field_label, // Map field_label back to label for frontend
        name: field.field_name, // Map field_name back to name for frontend
        type: field.field_type, // Map field_type back to type for frontend
        position: field.field_order, // Map field_order back to position for frontend
        section: field.validation?.section || 'General Information', // Extract section from validation
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        validation: field.validation
      })),
      createdAt: form.created_at,
      updatedAt: form.updated_at
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}