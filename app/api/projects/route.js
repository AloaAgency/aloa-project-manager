import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  handleSupabaseError,
  requireAdminServiceRole,
} from '@/app/api/_utils/admin';

export async function GET() {
  try {
    const adminContext = await requireAdminServiceRole();
    if (adminContext.error) {
      return adminContext.error;
    }

    const { serviceSupabase } = adminContext;

    const tableExists = await ensureProjectsTable(serviceSupabase);

    // If table doesn't exist, return empty array
    if (!tableExists) {

      return NextResponse.json([]);
    }

    // Fetch all projects with their forms count
    const { data: projects, error } = await serviceSupabase
      .from('aloa_projects')
      .select(`
        *,
        aloa_forms(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch projects');
    }

    // Format the response to include formCount
    const projectsWithCount = (projects || []).map(project => ({
      ...project,
      formCount: project.aloa_forms?.[0]?.count || 0
    }));

    return NextResponse.json(projectsWithCount);
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const adminContext = await requireAdminServiceRole();
    if (adminContext.error) {
      return adminContext.error;
    }

    const { serviceSupabase } = adminContext;

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const tableExists = await ensureProjectsTable(serviceSupabase);

    if (!tableExists) {
      return NextResponse.json(
        { error: 'Projects table does not exist. Please create it in Supabase first.' },
        { status: 503 }
      );
    }

    // Create new project
    const newProject = {
      id: nanoid(),
      name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await serviceSupabase
      .from('aloa_projects')
      .insert([newProject])
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'Failed to create project');
    }

    return NextResponse.json(data);
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// Helper function to ensure projects table exists
async function ensureProjectsTable(serviceSupabase) {
  try {
    // Check if projects table exists by trying to select from it
    const { error } = await serviceSupabase
      .from('aloa_projects')
      .select('id')
      .limit(1);

    // If table doesn't exist, we'll get an error
    // In production, you'd create this table via Supabase dashboard or migration
    // For now, we'll just log the need to create it
    if (error && error.code === '42P01') {
      // Table doesn't exist - would need to create via migration
      return false; // Table doesn't exist
    }

    if (error) {
      throw error;
    }

    return true; // Table exists
  } catch (error) {

    return false; // Assume table doesn't exist on error
  }
}
