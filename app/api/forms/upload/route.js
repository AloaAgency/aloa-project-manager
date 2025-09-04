import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseMarkdownToForm } from '@/lib/markdownParser';
import { nanoid } from 'nanoid';
import { validateFileUpload, sanitizeText } from '@/lib/security';

export async function POST(request) {
  try {
    // Verify CSRF token (skip for AI-generated forms if no token exists yet)
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const isAiGenerated = request.headers.get('X-AI-Generated') === 'true';
    
    // Only enforce CSRF if not AI-generated or if tokens exist
    if (!isAiGenerated && (!csrfToken || !cookieToken || csrfToken !== cookieToken)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('markdown');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Validate file upload
    try {
      validateFileUpload(file, {
        maxSize: 5 * 1024 * 1024, // 5MB max
        allowedTypes: ['text/plain', 'text/markdown', 'text/x-markdown', 'application/x-markdown'],
        allowedExtensions: ['.txt', '.md', '.markdown']
      });
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }
    
    // Read and validate content
    const content = await file.text();
    
    // Check for potentially malicious content
    if (content.includes('<script') || content.includes('javascript:') || 
        content.includes('onerror=') || content.includes('onclick=')) {
      return NextResponse.json(
        { error: 'File contains potentially malicious content' },
        { status: 400 }
      );
    }
    
    // Limit content size
    if (content.length > 100000) { // 100KB of text
      return NextResponse.json(
        { error: 'File content is too large' },
        { status: 400 }
      );
    }
    
    try {
      const formStructure = parseMarkdownToForm(content);
      
      // Sanitize form data
      const formToInsert = {
        title: sanitizeText(formStructure.title).substring(0, 200),
        description: sanitizeText(formStructure.description || '').substring(0, 1000),
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
        // Sanitize and validate fields
        const fieldsToInsert = formStructure.fields.map((field, index) => {
          // Validate field type
          const allowedTypes = ['text', 'email', 'tel', 'url', 'number', 'date', 
                               'textarea', 'select', 'radio', 'checkbox', 'multiselect', 'rating'];
          
          if (!allowedTypes.includes(field.type)) {
            throw new Error(`Invalid field type: ${field.type}`);
          }
          
          return {
            form_id: form.id,
            field_label: sanitizeText(field.label).substring(0, 200),
            field_name: sanitizeText(field.name).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100),
            field_type: field.type,
            required: Boolean(field.required),
            placeholder: field.placeholder ? sanitizeText(field.placeholder).substring(0, 200) : null,
            options: Array.isArray(field.options) ? 
              field.options.map(opt => sanitizeText(opt).substring(0, 100)) : null,
            validation: {
              ...field.validation,
              section: sanitizeText(field.section || 'General Information').substring(0, 100)
            },
            field_order: Math.min(Math.max(0, index), 1000) // Limit field order
          };
        });
        
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