import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get('type') || 'full_project';
    const categories = searchParams.get('categories')?.split(',');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      const { data: cachedContext, error: cacheError } = await supabase
        .from('aloa_ai_context_cache')
        .select('*')
        .eq('project_id', projectId)
        .eq('context_type', contextType)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedContext && !cacheError) {
        return NextResponse.json({
          context: cachedContext.context_data,
          cached: true,
          cachedAt: cachedContext.created_at
        });
      }
    }

    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let knowledgeQuery = supabase
      .from('aloa_project_knowledge')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (contextType === 'design_brief') {
      knowledgeQuery = knowledgeQuery.in('category', ['brand_identity', 'design_preferences', 'inspiration']);
    } else if (contextType === 'content_brief') {
      knowledgeQuery = knowledgeQuery.in('category', ['content_strategy', 'brand_identity', 'target_audience']);
    } else if (contextType === 'technical_brief') {
      knowledgeQuery = knowledgeQuery.in('category', ['functionality', 'technical_specs']);
    } else if (contextType === 'brand_guide') {
      knowledgeQuery = knowledgeQuery.in('category', ['brand_identity', 'content_strategy', 'design_preferences']);
    } else if (categories && categories.length > 0) {
      knowledgeQuery = knowledgeQuery.in('category', categories);
    }

    knowledgeQuery = knowledgeQuery.limit(50);

    const { data: knowledge, error: knowledgeError } = await knowledgeQuery;

    if (knowledgeError) {

      return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 });
    }

    const { data: recentResponses } = await supabase
      .from('aloa_applet_responses')
      .select(`
        *,
        form:aloa_forms(title)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentInteractions } = await supabase
      .from('aloa_applet_interactions')
      .select(`
        *,
        applet:aloa_applets(name, type)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10);

    const knowledgeByCategory = {};
    knowledge.forEach(item => {
      const cat = item.category || 'uncategorized';
      if (!knowledgeByCategory[cat]) {
        knowledgeByCategory[cat] = [];
      }
      knowledgeByCategory[cat].push({
        source: item.source_name,
        type: item.source_type,
        content: item.content,
        summary: item.content_summary,
        importance: item.importance_score,
        tags: item.tags,
        extracted_at: item.processed_at
      });
    });

    const contextData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        metadata: project.metadata || {}
      },
      knowledge: knowledgeByCategory,
      recent_activity: {
        form_responses: recentResponses?.map(r => ({
          form: r.form?.title,
          submitted_at: r.created_at,
          data_preview: Object.keys(r.response_data || {}).slice(0, 5)
        })),
        interactions: recentInteractions?.map(i => ({
          applet: i.applet?.name,
          type: i.applet?.type,
          interaction_type: i.interaction_type,
          at: i.created_at
        }))
      },
      statistics: {
        total_knowledge_items: knowledge.length,
        knowledge_sources: [...new Set(knowledge.map(k => k.source_type))],
        categories_covered: Object.keys(knowledgeByCategory),
        average_importance: knowledge.reduce((sum, k) => sum + k.importance_score, 0) / (knowledge.length || 1)
      },
      context_metadata: {
        type: contextType,
        generated_at: new Date().toISOString(),
        knowledge_cutoff: knowledge[knowledge.length - 1]?.created_at || null,
        categories_requested: categories || null
      }
    };

    const { error: cacheError } = await supabase
      .from('aloa_ai_context_cache')
      .upsert({
        project_id: projectId,
        context_type: contextType,
        context_data: contextData,
        token_count: JSON.stringify(contextData).length / 4,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }, {
        onConflict: 'project_id,context_type'
      });

    if (cacheError) {

    }

    return NextResponse.json({
      context: contextData,
      cached: false
    });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;

    const { error } = await supabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    if (error) {

      return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Context cache cleared' });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}