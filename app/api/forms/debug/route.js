import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function GET() {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    // Fetch all forms to see their current URLs
    const { data: forms, error } = await serviceSupabase
      .from('aloa_forms')
      .select('id, title, url_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch forms');
    }

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
