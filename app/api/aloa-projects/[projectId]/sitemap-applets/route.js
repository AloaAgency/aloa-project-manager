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
      console.error('Error fetching sitemap applets:', error);
      return NextResponse.json({ error: 'Failed to fetch sitemap applets' }, { status: 500 });
    }

    console.log('Found applets:', applets?.length || 0);
    if (applets && applets.length > 0) {
      console.log('Applet IDs:', applets.map(a => ({ id: a.id, name: a.name })));
    }

    // Transform applets and check for sitemap data
    const appletsWithSitemapData = (applets || []).filter(applet => {
      // Check if sitemap data exists in config
      const sitemapData = applet.config?.sitemap_data;
      console.log('Applet:', applet.name);
      console.log('Config:', JSON.stringify(applet.config, null, 2));
      console.log('Has sitemap_data?', !!sitemapData);
      console.log('Has navigation/footer?', !!(sitemapData?.navigation || sitemapData?.footer));

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

    console.log('Filtered applets with sitemap data:', appletsWithSitemapData.length);
    if (appletsWithSitemapData.length > 0) {
      console.log('First applet sitemap data:', JSON.stringify(appletsWithSitemapData[0].sitemap_data, null, 2));
    }
    return NextResponse.json({ applets: appletsWithSitemapData });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}