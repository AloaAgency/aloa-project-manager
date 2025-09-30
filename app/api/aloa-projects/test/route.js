import { NextResponse } from 'next/server';
import { requireAdminServiceRole } from '@/app/api/_utils/admin';

export async function GET() {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      supabase_config: {
        url_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        publishable_key_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        secret_key_configured: Boolean(process.env.SUPABASE_SECRET_KEY),
        url_value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        client_initialized: true,
      },
      connection_test: {},
      table_tests: {},
    };

    try {
      const { error: connectionError } = await serviceSupabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      testResults.connection_test = {
        status: connectionError ? 'FAILED' : 'SUCCESS',
        error: connectionError?.message || null,
        can_query_system_tables: !connectionError,
      };
    } catch (error) {
      testResults.connection_test = {
        status: 'FAILED',
        error: error.message,
        can_query_system_tables: false,
      };
    }

    const aloaTables = [
      'aloa_projects',
      'aloa_projectlets',
      'aloa_project_team',
      'aloa_project_timeline',
      'aloa_project_assets',
    ];

    for (const tableName of aloaTables) {
      try {
        const { error, count } = await serviceSupabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        testResults.table_tests[tableName] = {
          status: error ? 'FAILED' : 'SUCCESS',
          exists: !error,
          error: error?.message || null,
          record_count: error ? null : count,
        };
      } catch (error) {
        testResults.table_tests[tableName] = {
          status: 'FAILED',
          exists: false,
          error: error.message,
          record_count: null,
        };
      }
    }

    try {
      const { data: projects, error: projectsError } = await serviceSupabase
        .from('aloa_projects')
        .select('id, project_name, status, created_at')
        .limit(5);

      testResults.sample_query = {
        status: projectsError ? 'FAILED' : 'SUCCESS',
        error: projectsError?.message || null,
        sample_records: projectsError ? null : projects?.length || 0,
        first_record: projects?.[0] || null,
      };
    } catch (error) {
      testResults.sample_query = {
        status: 'FAILED',
        error: error.message,
        sample_records: null,
        first_record: null,
      };
    }

    const hasFailures =
      testResults.connection_test.status === 'FAILED' ||
      Object.values(testResults.table_tests).some((test) => test.status === 'FAILED');

    return NextResponse.json({
      success: !hasFailures,
      message: hasFailures
        ? 'Some tests failed - check test_results for details'
        : 'All tests passed successfully',
      overall_status: hasFailures ? 'FAILED' : 'SUCCESS',
      test_results: testResults,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Test endpoint error',
        error: error.message,
        test_results: {
          timestamp: new Date().toISOString(),
          fatal_error: error.message,
        },
      },
      { status: 500 }
    );
  }
}
