import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    // Fetch all forms with their fields and response count
    const { data: forms, error } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order
        ),
        form_responses(count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Format the response to include responseCount and fields
    const formsWithCount = forms.map(form => ({
      ...form,
      _id: form.id, // Keep _id for compatibility
      urlId: form.url_id, // Add urlId for form viewing
      createdAt: form.created_at, // Add createdAt for display
      fields: form.form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)).map(field => ({
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
      })) || [],
      responseCount: form.form_responses?.[0]?.count || 0
    }));
    
    return NextResponse.json(formsWithCount);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Start a transaction by creating the form first
    const formData = {
      title: body.title,
      description: body.description,
      url_id: body.urlId || nanoid(10),
      markdown_content: body.markdownContent || '' // Add markdown_content with default empty string
    };
    
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert([formData])
      .select()
      .single();
    
    if (formError) throw formError;
    
    // If there are fields, insert them
    if (body.fields && body.fields.length > 0) {
      const fieldsToInsert = body.fields.map((field, index) => ({
        form_id: form.id,
        field_label: field.label,
        field_name: field.name,
        field_type: field.type,
        required: field.required || false,
        placeholder: field.placeholder || null,
        options: field.options || null,
        validation: field.validation || null,
        field_order: index
      }));
      
      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);
      
      if (fieldsError) {
        // Rollback by deleting the form
        await supabase.from('forms').delete().eq('id', form.id);
        throw fieldsError;
      }
    }
    
    return NextResponse.json({
      ...form,
      _id: form.id,
      urlId: form.url_id
    });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}