import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      console.log('Supabase is not configured. Returning empty projects array.');
      return NextResponse.json([]);
    }
    
    // First, ensure the projects table exists
    const tableExists = await ensureProjectsTable();
    
    // If table doesn't exist, return empty array
    if (!tableExists) {
      console.log('Projects table does not exist yet. Please create it in Supabase.');
      return NextResponse.json([]);
    }
    
    // Fetch all projects with their forms count
    const { data: projects, error } = await supabase
      .from('aloa_projects')
      .select(`
        *,
        aloa_forms(count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      // Return empty array instead of error to prevent client-side crashes
      return NextResponse.json([]);
    }
    
    // Format the response to include formCount
    const projectsWithCount = (projects || []).map(project => ({
      ...project,
      formCount: project.aloa_forms?.[0]?.count || 0
    }));
    
    return NextResponse.json(projectsWithCount);
  } catch (error) {
    console.error('Error fetching projects:', error);
    // Return empty array instead of error to prevent client-side crashes
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // First, ensure the projects table exists
    const tableExists = await ensureProjectsTable();
    
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

    const { data, error } = await supabase
      .from('aloa_projects')
      .insert([newProject])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// Helper function to ensure projects table exists
async function ensureProjectsTable() {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return false;
    }
    
    // Check if projects table exists by trying to select from it
    const { error } = await supabase
      .from('aloa_projects')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, we'll get an error
    // In production, you'd create this table via Supabase dashboard or migration
    // For now, we'll just log the need to create it
    if (error && error.code === '42P01') {
      console.log('Projects table needs to be created in Supabase');
      console.log(`
        CREATE TABLE aloa_projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE aloa_forms ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES aloa_projects(id);
      `);
      return false; // Table doesn't exist
    }
    
    return true; // Table exists
  } catch (error) {
    console.error('Error checking projects table:', error);
    return false; // Assume table doesn't exist on error
  }
}