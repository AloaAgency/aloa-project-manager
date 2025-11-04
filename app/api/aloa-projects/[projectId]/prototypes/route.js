import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase service client for storage operations
const getServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// GET - List all prototypes for a project/applet
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('aloa_prototypes')
      .select('*')
      .eq('aloa_project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Filter by applet if provided
    if (appletId) {
      query = query.eq('applet_id', appletId);
    }

    const { data: prototypes, error } = await query;

    if (error) {
      console.error('Error fetching prototypes:', error);
      return NextResponse.json({ error: 'Failed to fetch prototypes' }, { status: 500 });
    }

    return NextResponse.json({ prototypes: prototypes || [] });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new prototype from URL
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!body.name || !body.sourceType) {
      return NextResponse.json(
        { error: 'Name and sourceType are required' },
        { status: 400 }
      );
    }

    if (body.sourceType === 'url' && !body.sourceUrl) {
      return NextResponse.json(
        { error: 'sourceUrl is required for URL-based prototypes' },
        { status: 400 }
      );
    }

    // Create prototype record
    const prototypeData = {
      aloa_project_id: projectId,
      applet_id: body.appletId,
      name: body.name,
      description: body.description || null,
      version: body.version || '1.0',
      status: 'active',
      source_type: body.sourceType,
      source_url: body.sourceUrl || null,
      viewport_width: body.viewportWidth || 1920,
      viewport_height: body.viewportHeight || 1080,
      device_type: body.deviceType || 'desktop',
      review_deadline: body.reviewDeadline || null,
      requires_approval: body.requiresApproval || false,
      min_reviewers: body.minReviewers || 1,
      created_by: user.id
    };

    const { data: prototype, error } = await supabase
      .from('aloa_prototypes')
      .insert([prototypeData])
      .select()
      .single();

    if (error) {
      console.error('Error creating prototype:', error);
      return NextResponse.json(
        { error: 'Failed to create prototype', details: error.message },
        { status: 500 }
      );
    }

    // Log to project timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: projectId,
        event_type: 'prototype_created',
        description: `Prototype "${body.name}" created`,
        user_id: user.id,
        metadata: {
          prototype_id: prototype.id,
          prototype_name: body.name,
          source_type: body.sourceType
        }
      });

    return NextResponse.json({ prototype });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a prototype
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const prototypeId = searchParams.get('prototypeId');

    if (!prototypeId) {
      return NextResponse.json({ error: 'Prototype ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prototype details first for cleanup
    const { data: prototype } = await supabase
      .from('aloa_prototypes')
      .select('*')
      .eq('id', prototypeId)
      .eq('aloa_project_id', projectId)
      .single();

    if (!prototype) {
      return NextResponse.json({ error: 'Prototype not found' }, { status: 404 });
    }

    // Delete file from storage if exists
    if (prototype.file_url) {
      const serviceClient = getServiceClient();
      const storagePath = prototype.file_url.split('/').pop();

      try {
        await serviceClient.storage
          .from('prototype-files')
          .remove([`${projectId}/${storagePath}`]);
      } catch (err) {
        console.error('Error deleting file from storage:', err);
        // Continue with deletion even if storage cleanup fails
      }
    }

    // Soft delete - mark as archived instead of hard delete
    const { error } = await supabase
      .from('aloa_prototypes')
      .update({ status: 'archived' })
      .eq('id', prototypeId);

    if (error) {
      console.error('Error deleting prototype:', error);
      return NextResponse.json({ error: 'Failed to delete prototype' }, { status: 500 });
    }

    // Log to timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: projectId,
        event_type: 'prototype_deleted',
        description: `Prototype "${prototype.name}" deleted`,
        user_id: user.id,
        metadata: {
          prototype_id: prototype.id,
          prototype_name: prototype.name
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
