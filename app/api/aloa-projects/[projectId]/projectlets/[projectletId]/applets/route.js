import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// GET all applets for a projectlet
export async function GET(request, { params }) {
  try {
    const { projectletId } = params;

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

    const { data: applets, error } = await supabase
      .from('aloa_applets')
      .select('*')
      .eq('projectlet_id', projectletId)
      .order('order_index', { ascending: true });

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch applets' }, { status: 500 });
    }

    // Fetch user progress for each applet
    const appletsWithProgress = await Promise.all(applets.map(async (applet) => {
      // Get all user progress records for this applet
      const { data: userProgress } = await supabase
        .from('aloa_applet_progress')
        .select('user_id, status, completion_percentage, completed_at')
        .eq('applet_id', applet.id);

      // Calculate completion stats
      const completedUsers = userProgress?.filter(p => 
        p.status === 'completed' || p.status === 'approved'
      ) || [];

      const inProgressUsers = userProgress?.filter(p => 
        p.status === 'in_progress'
      ) || [];

      return {
        ...applet,
        user_progress_summary: {
          total_users: userProgress?.length || 0,
          completed_count: completedUsers.length,
          in_progress_count: inProgressUsers.length,
          completed_users: completedUsers,
          all_progress: userProgress || []
        }
      };
    }));

    return NextResponse.json({ applets: appletsWithProgress || [] });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new applet
export async function POST(request, { params }) {
  try {
    const { projectletId } = params;
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

    // Get the current max order_index
    const { data: maxOrder } = await supabase
      .from('aloa_applets')
      .select('order_index')
      .eq('projectlet_id', projectletId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const newOrderIndex = maxOrder ? maxOrder.order_index + 1 : 0;

    const appletData = {
      projectlet_id: projectletId,
      name: body.name,
      description: body.description,
      type: body.type,
      order_index: newOrderIndex,
      config: body.config || {},
      form_id: body.form_id,
      requires_approval: body.requires_approval || false,
      client_instructions: body.client_instructions,
      internal_notes: body.internal_notes,
      client_can_skip: body.client_can_skip || false,
      library_applet_id: body.library_applet_id,
      client_visible: false
    };

    // Create the applet
    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .insert([appletData])
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to create applet', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update applet
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const {
      appletId,
      clientVisible: clientVisibleCamel,
      client_visible: clientVisibleSnake,
      ...rest
    } = body;

    const updateData = { ...rest };

    if (typeof clientVisibleCamel === 'boolean') {
      updateData.client_visible = clientVisibleCamel;
    } else if (typeof clientVisibleSnake === 'boolean') {
      updateData.client_visible = clientVisibleSnake;
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

    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .update(updateData)
      .eq('id', appletId)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update applet status
export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { appletId, status, completion_percentage } = body;

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

    const updateData = { status };

    if (completion_percentage !== undefined) {
      updateData.completion_percentage = completion_percentage;
    }

    // Update timestamps based on status
    if (status === 'active' || status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'approved') {
      updateData.completed_at = new Date().toISOString();
      updateData.completion_percentage = 100;
    }

    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .update(updateData)
      .eq('id', appletId)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update applet status' }, { status: 500 });
    }

    // Record the interaction
    await supabase
      .from('aloa_applet_interactions')
      .insert([{
        applet_id: appletId,
        project_id: params.projectId,
        interaction_type: status === 'approved' ? 'approval' : 'submission',
        user_role: 'admin',
        data: { status_change: status }
      }]);

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE applet
export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const appletId = searchParams.get('appletId');

    if (!appletId) {
      return NextResponse.json({ error: 'Applet ID required' }, { status: 400 });
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

    const { error } = await supabase
      .from('aloa_applets')
      .delete()
      .eq('id', appletId);

    if (error) {

      return NextResponse.json({ error: 'Failed to delete applet' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
