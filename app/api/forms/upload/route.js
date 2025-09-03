import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseMarkdownToForm } from '@/lib/markdownParser';
import { nanoid } from 'nanoid';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('markdown');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    const content = await file.text();
    
    try {
      const formStructure = parseMarkdownToForm(content);
      
      // Create the form first
      const formToInsert = {
        title: formStructure.title,
        description: formStructure.description,
        url_id: nanoid(10),
        markdown_content: content // Store the original markdown content
      };
      
      const { data: form, error: formError } = await supabase
        .from('forms')
        .insert([formToInsert])
        .select()
        .single();
      
      if (formError) throw formError;
      
      // Insert the fields if any
      if (formStructure.fields && formStructure.fields.length > 0) {
        // Store section info in validation JSONB field as a workaround
        const fieldsToInsert = formStructure.fields.map((field, index) => ({
          form_id: form.id,
          field_label: field.label,
          field_name: field.name,
          field_type: field.type,
          required: field.required || false,
          placeholder: field.placeholder || null,
          options: field.options || null,
          validation: {
            ...field.validation,
            section: field.section || 'General Information'
          },
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
        _id: form.id,
        urlId: form.url_id,
        title: form.title
      });
    } catch (parseError) {
      console.error('Parsing error:', parseError);
      return NextResponse.json(
        { error: parseError.message || 'Invalid markdown format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}