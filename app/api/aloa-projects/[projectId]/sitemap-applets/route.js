import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Fetch all sitemap_builder applets from this project
    const { data: applets, error } = await supabase
      .from('aloa_applets')
      .select(`
        id,
        name,
        type,
        config,
        projectlet_id,
        aloa_projectlets!inner (
          name,
          project_id
        )
      `)
      .eq('type', 'sitemap')
      .eq('aloa_projectlets.project_id', projectId);

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch sitemap applets' }, { status: 500 });
    }

    if (applets && applets.length > 0) {
      // Processing applets with sitemap data
    }

    // Transform applets and check for sitemap data
    const appletsWithSitemapData = (applets || []).filter(applet => {
      // Check if sitemap data exists in config
      const sitemapData = applet.config?.sitemap_data;

      // Return true if sitemap_data exists and has navigation or footer arrays
      return sitemapData && (Array.isArray(sitemapData.navigation) || Array.isArray(sitemapData.footer));
    }).map(applet => ({
      id: applet.id,
      name: applet.name,
      projectlet_id: applet.projectlet_id,
      projectlet_name: applet.aloa_projectlets.name,
      config: applet.config,
      sitemap_data: applet.config?.sitemap_data
    }));

    if (appletsWithSitemapData.length > 0) {
      // Found applets with sitemap data
    }
    return NextResponse.json({ applets: appletsWithSitemapData });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}