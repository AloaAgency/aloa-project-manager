import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    // Fetch all projects with their stats
    const { data: projects, error, count } = await supabase
      .from('aloa_projects')
      .select(`
        *,
        aloa_projectlets (
          id,
          status
        ),
        aloa_project_team (
          id,
          email,
          name,
          role
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Calculate stats for each project
    const projectsWithStats = projects?.map(project => {
      const projectlets = project.aloa_projectlets || [];
      const totalProjectlets = projectlets.length;
      const completedProjectlets = projectlets.filter(p => p.status === 'completed').length;
      const completionPercentage = totalProjectlets > 0
        ? Math.round((completedProjectlets / totalProjectlets) * 100)
        : 0;

      return {
        ...project,
        stats: {
          totalProjectlets,
          completedProjectlets,
          completionPercentage
        }
      };
    }) || [];

    return NextResponse.json({
      projects: projectsWithStats,
      total: projectsWithStats.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}