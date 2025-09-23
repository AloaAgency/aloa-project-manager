import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PATCH - Update applet config
export async function PATCH(request, { params }) {
  try {
    const { appletId } = params;
    const body = await request.json();

    // First, check if the applet exists
    const { data: existingApplet, error: fetchError } = await supabase
      .from('aloa_applets')
      .select('*')
      .eq('id', appletId)
      .single();

    if (fetchError) {

      return NextResponse.json({ error: 'Applet not found', details: fetchError }, { status: 404 });
    }

    // Update the applet
    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .update({
        config: body.config,
        updated_at: new Date().toISOString()
      })
      .eq('id', appletId)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update applet', details: error }, { status: 500 });
    }

    return NextResponse.json({ applet, success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Fetch single applet
export async function GET(request, { params }) {
  try {
    const { appletId } = params;

    const { data: applet, error } = await supabase
      .from('aloa_applets')
      .select('*')
      .eq('id', appletId)
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch applet' }, { status: 500 });
    }

    return NextResponse.json({ applet });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete applet
export async function DELETE(request, { params }) {
  try {
    const { appletId } = params;

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