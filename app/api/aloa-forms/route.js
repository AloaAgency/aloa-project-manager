import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');

    // Fetch from both legacy forms table and new aloa_forms table
    const allForms = [];

    // 1. Fetch from legacy forms table
    const { data: legacyForms } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (legacyForms) {
      // Process legacy forms
      const processedLegacyForms = await Promise.all(legacyForms.map(async (form) => {
        // Get response count
        const { count: responseCount } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .eq('formId', form._id);

        return {
          _id: form._id,
          id: form._id,
          title: form.title,
          description: form.description,
          urlId: form.urlId,
          status: form.is_active === false ? 'closed' : 'published',
          created_at: form.createdAt || form.created_at,
          createdAt: form.createdAt || form.created_at,
          response_count: responseCount || 0,
          responseCount: responseCount || 0,
          fields: form.fields || [],
          source: 'legacy',
          projectId: null,
          projectName: null
        };
      }));
      allForms.push(...processedLegacyForms);
    }

    // 2. Fetch from new aloa_forms table
    let aloaQuery = supabase
      .from('aloa_forms')
      .select('*');

    // Filter by project if specified (only applies to aloa_forms)
    if (projectId) {
      if (projectId === 'uncategorized') {
        aloaQuery = aloaQuery.is('aloa_project_id', null);
      } else {
        aloaQuery = aloaQuery.eq('aloa_project_id', projectId);
      }
    }

    const { data: aloaForms } = await aloaQuery.order('created_at', { ascending: false });

    if (aloaForms) {
      // Process aloa forms
      const processedAloaForms = await Promise.all(aloaForms.map(async (form) => {
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
          _id: form.id,
          id: form.id,
          title: form.title,
          description: form.description,
          urlId: form.url_id,
          status: form.status || (form.is_active === false ? 'closed' : 'published'),
          created_at: form.created_at,
          createdAt: form.created_at,
          response_count: responseCount || 0,
          responseCount: responseCount || 0,
          fields: fields || [],
          source: 'aloa',
          projectId: form.aloa_project_id,
          projectName
        };
      }));

      // If filtering by project, only include aloa forms that match
      if (!projectId || projectId === 'all') {
        allForms.push(...processedAloaForms);
      } else {
        allForms.push(...processedAloaForms);
      }
    }

    // Sort all forms by creation date (newest first)
    allForms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Format response for compatibility
    const response = {
      forms: allForms,
      total: allForms.length
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms', forms: [] },
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

    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}