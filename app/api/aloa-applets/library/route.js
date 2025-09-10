import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all library applets
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    let query = supabase
      .from('aloa_applet_library')
      .select('*')
      .order('usage_count', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data: applets, error } = await query;

    if (error) {
      console.error('Error fetching applet library:', error);
      return NextResponse.json({ error: 'Failed to fetch applet library' }, { status: 500 });
    }

    return NextResponse.json({ applets: applets || [] });
  } catch (error) {
    console.error('Error in applet library route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new library applet
export async function POST(request) {
  try {
    const body = await request.json();

    const { data: applet, error } = await supabase
      .from('aloa_applet_library')
      .insert([{
        name: body.name,
        description: body.description,
        type: body.type,
        icon: body.icon,
        config_schema: body.config_schema || {},
        default_config: body.default_config || {},
        is_client_facing: body.is_client_facing !== false,
        requires_approval: body.requires_approval || false,
        allows_revision: body.allows_revision || false,
        auto_completes: body.auto_completes || false,
        tags: body.tags || [],
        created_by: body.created_by || 'admin'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating library applet:', error);
      return NextResponse.json({ error: 'Failed to create library applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {
    console.error('Error in library applet creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update library applet
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const { data: applet, error } = await supabase
      .from('aloa_applet_library')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating library applet:', error);
      return NextResponse.json({ error: 'Failed to update library applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {
    console.error('Error in library applet update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}