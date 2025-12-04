import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  requireAuthenticatedSupabase,
} from '@/app/api/_utils/admin';

// GET - Retrieve app settings (authenticated users can read)
export async function GET(request) {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const serviceSupabase = createServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    let query = serviceSupabase.from('aloa_app_settings').select('*');

    if (key) {
      query = query.eq('key', key).single();
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist, return empty/defaults
      if (error.code === '42P01') {
        if (key === 'default_notification_email') {
          return NextResponse.json({
            setting: { key: 'default_notification_email', value: 'info@aloa.agency' },
          });
        }
        return NextResponse.json({ settings: [] });
      }
      return handleSupabaseError(error, 'Failed to fetch app settings');
    }

    if (key) {
      return NextResponse.json({ setting: data });
    }

    return NextResponse.json({ settings: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch app settings' }, { status: 500 });
  }
}

// PATCH - Update app settings (super_admin only)
export async function PATCH(request) {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, role } = authContext;

  // Only super_admin can update app settings
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super admin access required' }, { status: 403 });
  }

  const serviceSupabase = createServiceClient();

  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    // Validate key format (alphanumeric with underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: 'Invalid key format. Use lowercase letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    const updatePayload = {
      key,
      value: JSON.stringify(value),
      updated_by: user.id,
    };

    if (description !== undefined) {
      updatePayload.description = description;
    }

    // Upsert the setting
    const { data, error } = await serviceSupabase
      .from('aloa_app_settings')
      .upsert(updatePayload, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to update app setting');
    }

    // Parse the value back for the response
    const setting = {
      ...data,
      value: JSON.parse(data.value),
    };

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update app setting' }, { status: 500 });
  }
}

// DELETE - Remove an app setting (super_admin only)
export async function DELETE(request) {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { role } = authContext;

  // Only super_admin can delete app settings
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super admin access required' }, { status: 403 });
  }

  const serviceSupabase = createServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('aloa_app_settings')
      .delete()
      .eq('key', key);

    if (error) {
      return handleSupabaseError(error, 'Failed to delete app setting');
    }

    return NextResponse.json({ success: true, message: `Setting '${key}' deleted` });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete app setting' }, { status: 500 });
  }
}
