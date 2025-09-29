import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';
import { nanoid } from 'nanoid';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = supabase
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
        ),
        aloa_form_responses(count),
        aloa_projects (
          id,
          name
        )
      `);

    // Filter by project if specified
    if (projectId) {
      query = query.eq('aloa_project_id', projectId);
    }

    // Execute query
    const { data: forms, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Format the response to include responseCount and fields
    const formsWithCount = forms.map(form => ({
      ...form,
      _id: form.id, // Keep _id for compatibility
      urlId: form.url_id, // Add urlId for form viewing
      createdAt: form.created_at, // Add createdAt for display
      projectId: form.project_id, // Add projectId
      projectName: form.aloa_projects?.name, // Add project name if joined
      fields: form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)).map(field => ({
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
      responseCount: form.aloa_form_responses?.[0]?.count || 0
    }));

    return NextResponse.json(formsWithCount);
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Start a transaction by creating the form first
    const formData = {
      title: body.title,
      description: body.description,
      url_id: body.urlId || nanoid(10),
      markdown_content: body.markdownContent || '', // Add markdown_content with default empty string
      aloa_project_id: body.projectId || null // Add project association
    };

    const { data: form, error: formError } = await supabase
      .from('aloa_forms')
      .insert([formData])
      .select()
      .single();

    if (formError) throw formError;

    // If there are fields, insert them
    if (body.fields && body.fields.length > 0) {
      const fieldsToInsert = body.fields.map((field, index) => ({
        aloa_form_id: form.id,
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
        .from('aloa_form_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Rollback by deleting the form
       await supabase.from('aloa_forms').delete().eq('id', form.id);
        throw fieldsError;
      }
    }

    return NextResponse.json({
      ...form,
      _id: form.id,
      urlId: form.url_id
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
