import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    // Debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_publishable_key: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_secret_key: !!process.env.SUPABASE_SECRET_KEY,
    };

    // Try fetching with different methods
    const results = {};

    // Method 1: Simple select
    const { data: simpleData, error: simpleError, count: simpleCount } = await supabase
      .from('aloa_projects')
      .select('*', { count: 'exact' });

    results.simple = {
      count: simpleCount,
      error: simpleError?.message || null,
      data_length: simpleData?.length || 0,
      first_three_ids: simpleData?.slice(0, 3).map(p => ({ id: p.id.substring(0, 8), name: p.project_name }))
    };

    // Method 2: With relations
    const { data: withRelations, error: relError, count: relCount } = await supabase
      .from('aloa_projects')
      .select(`
        *,
        aloa_projectlets (id),
        aloa_project_team (id)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    results.with_relations = {
      count: relCount,
      error: relError?.message || null,
      data_length: withRelations?.length || 0,
      first_three_ids: withRelations?.slice(0, 3).map(p => ({ id: p.id.substring(0, 8), name: p.project_name }))
    };

    // Method 3: Raw count
    const { count: rawCount, error: countError } = await supabase
      .from('aloa_projects')
      .select('*', { count: 'exact', head: true });

    results.raw_count = {
      count: rawCount,
      error: countError?.message || null
    };

    // Check RLS status (this will only work with service role key)
    let rlsStatus = 'unknown';
    try {
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('current_setting', { setting: 'row_security.active' });

      if (!rlsError && rlsData !== undefined) {
        rlsStatus = rlsData;
      }
    } catch (e) {
      rlsStatus = 'error: ' + e.message;
    }

    // Get current user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const userInfo = {
      authenticated: !!user,
      user_id: user?.id?.substring(0, 8) || 'none',
      auth_error: authError?.message || null
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
        message: results.simple.data_length === 0 ?
          'No projects found - check database connection' :
          `Found ${results.simple.data_length} projects`
      }
    });

  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}