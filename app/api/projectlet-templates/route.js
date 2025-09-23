import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';
import { cookies } from 'next/headers';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Fetch templates that are either public or created by the user
    const query = supabase
      .from('aloa_projectlet_templates')
      .select(`
        *,
        created_by_profile:aloa_user_profiles!aloa_projectlet_templates_created_by_fkey(
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    // If user is authenticated, show their templates and public ones
    // Otherwise, just show public templates
    if (userId) {
      query.or(`is_public.eq.true,created_by.eq.${userId}`);
    } else {
      query.eq('is_public', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    // Format the response
    const formattedTemplates = templates.map(template => ({
      ...template,
      created_by_name: template.created_by_profile?.full_name
    }));

    return NextResponse.json({ templates: formattedTemplates });
  } catch (error) {
    console.error('Error in GET /api/projectlet-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('POST /api/projectlet-templates - Starting');

    const cookieStore = await cookies();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError || 'No user found');
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    // Validate required fields
    if (!body.name || !body.template_data) {
      return NextResponse.json({ error: 'Name and template data are required' }, { status: 400 });
    }

    // Create the template
    const { data: template, error } = await supabase
      .from('aloa_projectlet_templates')
      .insert({
        name: body.name,
        description: body.description,
        template_data: body.template_data,
        category: body.category || 'other',
        is_public: body.is_public || false,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template: ' + error.message }, { status: 500 });
    }

    console.log('Template created successfully:', template.id);
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in POST /api/projectlet-templates:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Check if user owns the template or is super admin
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const { data: template } = await supabase
      .from('aloa_projectlet_templates')
      .select('created_by')
      .eq('id', templateId)
      .single();

    if (!template || (template.created_by !== userId && profile?.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized to delete this template' }, { status: 403 });
    }

    // Delete the template
    const { error } = await supabase
      .from('aloa_projectlet_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projectlet-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}