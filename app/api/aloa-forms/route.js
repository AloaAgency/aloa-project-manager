import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');
    
    // Build query - fetch forms first
    let query = supabase
      .from('aloa_forms')
      .select('*');
    
    // Filter by project if specified
    if (projectId) {
      if (projectId === 'uncategorized') {
        query = query.is('aloa_project_id', null);
      } else {
        query = query.eq('aloa_project_id', projectId);
      }
    }
    
    // Execute query
    const { data: forms, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.log('aloa_forms table does not exist yet');
        return NextResponse.json([]);
      }
      throw error;
    }
    
    // For each form, fetch related data separately
    const formsWithCount = await Promise.all((forms || []).map(async (form) => {
      // Fetch fields for this form
      const { data: fields } = await supabase
        .from('aloa_form_fields')
        .select('*')
        .eq('aloa_form_id', form.id)
        .order('field_order', { ascending: true });
      
      // Fetch response count
      const { count: responseCount } = await supabase
        .from('aloa_form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('aloa_form_id', form.id);
      
      // Get project name if there's a project ID
      let projectName = null;
      if (form.aloa_project_id) {
        const { data: project } = await supabase
          .from('aloa_projects')
          .select('project_name')
          .eq('id', form.aloa_project_id)
          .single();
        projectName = project?.project_name;
      }
      
      return {
        _id: form.id, // Dashboard expects _id
        id: form.id,
        title: form.title,
        description: form.description,
        urlId: form.url_id,
        is_active: form.is_active !== false, // Default to true if not explicitly false
        createdAt: form.created_at,
        projectId: form.aloa_project_id,
        projectName,
        fields: fields || [],
        responseCount: responseCount || 0,
        status: form.status
      };
    }));
    
    return NextResponse.json(formsWithCount);
  } catch (error) {
    console.error('Error fetching aloa_forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Create form data
    const formData = {
      title: body.title,
      description: body.description,
      url_id: body.urlId || nanoid(10),
      markdown_content: body.markdownContent || '',
      aloa_project_id: body.projectId || null,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    const { data: form, error: formError } = await supabase
      .from('aloa_forms')
      .insert([formData])
      .select()
      .single();
    
    if (formError) {
      // If table doesn't exist, log schema
      if (formError.code === '42P01') {
        console.log('aloa_forms table needs to be created:');
        console.log(`
          CREATE TABLE aloa_forms (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            url_id TEXT UNIQUE NOT NULL,
            markdown_content TEXT,
            aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE aloa_form_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
            field_label TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_type TEXT NOT NULL,
            required BOOLEAN DEFAULT false,
            placeholder TEXT,
            options JSONB,
            validation JSONB,
            field_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE aloa_form_responses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
            aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
            responses JSONB NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        return NextResponse.json(
          { error: 'aloa_forms table does not exist. Please create it in Supabase.' },
          { status: 503 }
        );
      }
      throw formError;
    }
    
    // If there are fields, insert them
    if (body.fields && body.fields.length > 0) {
      const fieldsToInsert = body.fields.map((field, index) => ({
        aloa_form_id: form.id,
        field_label: field.label || field.field_label,
        field_name: field.name || field.field_name || field.label?.toLowerCase().replace(/\s+/g, '_'),
        field_type: field.type || field.field_type || 'text',
        required: field.required || false,
        placeholder: field.placeholder || '',
        options: field.options || null,
        validation: {
          section: field.section || 'General Information',
          ...field.validation
        },
        field_order: field.position !== undefined ? field.position : index
      }));
      
      const { error: fieldsError } = await supabase
        .from('aloa_form_fields')
        .insert(fieldsToInsert);
      
      if (fieldsError) {
        // Rollback by deleting the form
        await supabase.from('aloa_forms').delete().eq('id', form.id);
        throw fieldsError;
      }
    }
    
    // Return the created form
    return NextResponse.json({
      id: form.id,
      urlId: form.url_id,
      title: form.title,
      description: form.description,
      projectId: form.aloa_project_id
    });
  } catch (error) {
    console.error('Error creating aloa_form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}