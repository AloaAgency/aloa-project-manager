import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all forms to see their current URLs
    const { data: forms, error } = await supabase
      .from('aloa_forms')
      .select('id, title, url_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      forms: forms.map(form => ({
        id: form.id,
        title: form.title,
        url_id: form.url_id,
        form_url: `/forms/${form.url_id}`,
        created: form.created_at,
        updated: form.updated_at
      }))
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}