import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(request) {
  try {
    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = createServiceClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all projects with their projectlets and applets
    const { data: projects, error } = await serviceSupabase
      .from('aloa_projects')
      .select(`
        *,
        aloa_projectlets (
          id,
          status,
          aloa_applets (
            id,
            status,
            completion_percentage
          )
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

    // Calculate stats for each project based on applet-level data
    const projectsWithStats = projects?.map(project => {
      const projectlets = project.aloa_projectlets || [];
      const totalProjectlets = projectlets.length;
      const completedProjectlets = projectlets.filter(p => p.status === 'completed').length;

      // Count applets based on their status field (agency-level completion)
      let totalApplets = 0;
      let completedApplets = 0;
      let inProgressApplets = 0;

      projectlets.forEach(projectlet => {
        const applets = projectlet.aloa_applets || [];

        // For locked projectlets with no applets, estimate 1 applet
        if (projectlet.status === 'locked' && applets.length === 0) {
          totalApplets += 1;
        } else {
          totalApplets += applets.length;

          // Count based on applet's own status field (not user-specific progress)
          applets.forEach(applet => {
            // Check the applet's main status or completion_percentage
            if (applet.status === 'completed' || applet.status === 'approved' ||
                applet.completion_percentage === 100) {
              completedApplets++;
            } else if (applet.status === 'in_progress' ||
                      (applet.completion_percentage > 0 && applet.completion_percentage < 100)) {
              inProgressApplets++;
            }
          });
        }
      });

      // Calculate completion percentage based on applets
      const completionPercentage = totalApplets > 0
        ? Math.round((completedApplets / totalApplets) * 100)
        : 0;

      return {
        ...project,
        stats: {
          totalProjectlets,
          completedProjectlets,
          totalApplets,
          completedApplets,
          inProgressApplets,
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
