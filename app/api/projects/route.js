import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    // First, ensure the projects table exists
    await ensureProjectsTable();
    
    // Fetch all projects with their forms count
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        forms(count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Format the response to include formCount
    const projectsWithCount = projects.map(project => ({
      ...project,
      formCount: project.forms?.[0]?.count || 0
    }));
    
    return NextResponse.json(projectsWithCount);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // First, ensure the projects table exists
    await ensureProjectsTable();

    // Create new project
    const newProject = {
      id: nanoid(),
      name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
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
    // Check if projects table exists by trying to select from it
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, we'll get an error
    // In production, you'd create this table via Supabase dashboard or migration
    // For now, we'll just log the need to create it
    if (error && error.code === '42P01') {
      console.log('Projects table needs to be created in Supabase');
      console.log(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE forms ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id);
      `);
    }
  } catch (error) {
    console.error('Error checking projects table:', error);
  }
}