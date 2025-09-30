import { NextResponse } from 'next/server';
import { handleSupabaseError, requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function GET() {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      has_publishable_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      has_service_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_secret_key: Boolean(process.env.SUPABASE_SECRET_KEY),
    };

    const results = {};

    const { data: simpleData, error: simpleError, count: simpleCount } = await serviceSupabase
      .from('aloa_projects')
      .select('*', { count: 'exact' });

    results.simple = {
      count: simpleCount,
      error: simpleError?.message || null,
      data_length: simpleData?.length || 0,
      first_three_ids: simpleData?.slice(0, 3).map((p) => ({
        id: p.id.substring(0, 8),
        name: p.project_name,
      })),
    };

    const { data: withRelations, error: relError, count: relCount } = await serviceSupabase
      .from('aloa_projects')
      .select(
        `
          *,
          aloa_projectlets (id),
          aloa_project_team (id)
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    results.with_relations = {
      count: relCount,
      error: relError?.message || null,
      data_length: withRelations?.length || 0,
      first_three_ids: withRelations?.slice(0, 3).map((p) => ({
        id: p.id.substring(0, 8),
        name: p.project_name,
      })),
    };

    const { count: rawCount, error: countError } = await serviceSupabase
      .from('aloa_projects')
      .select('*', { count: 'exact', head: true });

    results.raw_count = {
      count: rawCount,
      error: countError?.message || null,
    };

    let rlsStatus = 'unknown';
    try {
      const { data: rlsData, error: rlsError } = await serviceSupabase.rpc('current_setting', {
        setting: 'row_security.active',
      });

      if (!rlsError && rlsData !== undefined) {
        rlsStatus = rlsData;
      }
    } catch (error) {
      rlsStatus = `error: ${error.message}`;
    }

    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser();

    const userInfo = {
      authenticated: Boolean(user),
      user_id: user?.id?.substring(0, 8) || 'none',
      auth_error: authError?.message || null,
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      results,
      rls_status: rlsStatus,
      user_info: userInfo,
      summary: {
        total_projects_found: results.simple.data_length,
        all_methods_agree: results.simple.data_length === results.with_relations.data_length,
        message:
          results.simple.data_length === 0
            ? 'No projects found - check database connection'
            : `Found ${results.simple.data_length} projects`,
      },
    });
  } catch (error) {
    return handleSupabaseError(error, 'Failed to gather debug information');
  }
}
