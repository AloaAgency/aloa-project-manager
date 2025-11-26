export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';

// GET - Fetch writing style and samples for a project
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
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

    // Verify user has access (super_admin or project_admin with project access)
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch writing style
    const { data: writingStyle, error: styleError } = await supabase
      .from('aloa_project_writing_style')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (styleError) {
      console.error('Error fetching writing style:', styleError);
      return NextResponse.json({ error: 'Failed to fetch writing style' }, { status: 500 });
    }

    // Fetch writing samples
    const { data: samples, error: samplesError } = await supabase
      .from('aloa_project_writing_samples')
      .select('id, file_name, file_type, file_size, word_count, description, sample_type, created_at, is_active')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (samplesError) {
      console.error('Error fetching writing samples:', samplesError);
      return NextResponse.json({ error: 'Failed to fetch writing samples' }, { status: 500 });
    }

    return NextResponse.json({
      writingStyle: writingStyle || null,
      samples: samples || [],
      sampleCount: samples?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/project-writing-style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update writing style (style summary and attributes)
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
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

    // Verify permissions
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData = {
      project_id: projectId,
      updated_at: new Date().toISOString()
    };

    if (body.style_summary !== undefined) updateData.style_summary = body.style_summary;
    if (body.style_attributes !== undefined) updateData.style_attributes = body.style_attributes;
    if (body.tone_keywords !== undefined) updateData.tone_keywords = body.tone_keywords;
    if (body.voice_perspective !== undefined) updateData.voice_perspective = body.voice_perspective;
    if (body.formality_level !== undefined) updateData.formality_level = body.formality_level;
    if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes;
    if (body.do_not_use !== undefined) updateData.do_not_use = body.do_not_use;
    if (body.always_use !== undefined) updateData.always_use = body.always_use;

    // Upsert the writing style
    const { data: writingStyle, error: upsertError } = await supabase
      .from('aloa_project_writing_style')
      .upsert(updateData, { onConflict: 'project_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting writing style:', upsertError);
      return NextResponse.json({ error: 'Failed to update writing style' }, { status: 500 });
    }

    return NextResponse.json({ writingStyle });

  } catch (error) {
    console.error('Error in PUT /api/project-writing-style:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
