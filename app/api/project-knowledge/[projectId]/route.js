import { NextResponse } from 'next/server';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';
import { handleRLSError, handleDatabaseError } from '@/lib/rlsErrorHandler';
import { authorizeProjectAccess } from '@/app/api/project-knowledge/utils/auth';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const categories = searchParams.get('categories')?.split(',');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    const auth = await authorizeProjectAccess(projectId);
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    let query = serviceSupabase
      .from('aloa_project_knowledge')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }

    if (search) {
      query = query.or(`content.ilike.%${search}%,content_summary.ilike.%${search}%,source_name.ilike.%${search}%`);
    }

    const { data: knowledge, error } = await query;

    if (error) {
      // Check if it's an RLS error
      const rlsResponse = handleRLSError(error);
      if (rlsResponse) {
        // For RLS errors, return empty results to avoid breaking the UI
        console.warn('RLS policy violation in project knowledge GET:', error);
        return NextResponse.json({
          knowledge: [],
          stats: {
            total: 0,
            categoryCounts: {}
          }
        });
      }
      // For other errors, return empty results as well
      console.error('Database error in project knowledge GET:', error);
      return NextResponse.json({
        knowledge: [],
        stats: {
          total: 0,
          categoryCounts: {}
        }
      });
    }

    const categoryCounts = {};
    knowledge.forEach(item => {
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    });

    // Add caching headers - knowledge data is relatively stable, cache for 1 minute
    const response = NextResponse.json({
      knowledge,
      stats: {
        total: knowledge.length,
        categoryCounts
      }
    });
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { source_type, source_id, content, category, importance_score, tags } = body;

    if (!source_type || !content) {
      return NextResponse.json({
        error: 'source_type and content are required'
      }, { status: 400 });
    }

    const knowledgeItem = {
      project_id: projectId,
      source_type,
      source_id: source_id || null,
      source_name: body.source_name || source_type,
      source_url: body.source_url || null,
      content_type: body.content_type || 'text',
      content,
      content_summary: body.content_summary || content.substring(0, 200),
      category: category || null,
      tags: tags || [],
      importance_score: importance_score || 5,
      extracted_by: 'manual',
      extraction_confidence: 1.0,
      processed_at: new Date().toISOString(),
      is_current: true
    };

    const auth = await authorizeProjectAccess(projectId, { requireAdmin: true });
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    const { data, error } = await serviceSupabase
      .from('aloa_project_knowledge')
      .insert(knowledgeItem)
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, 'Failed to create knowledge');
    }

    await serviceSupabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json(data);
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { knowledgeId, ...updates } = body;

    if (!knowledgeId) {
      return NextResponse.json({
        error: 'knowledgeId is required'
      }, { status: 400 });
    }

    const auth = await authorizeProjectAccess(projectId, { requireAdmin: true });
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    const { data, error } = await serviceSupabase
      .from('aloa_project_knowledge')
      .update(updates)
      .eq('id', knowledgeId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      return handleDatabaseError(error, 'Failed to update knowledge');
    }

    await serviceSupabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json(data);
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const knowledgeId = searchParams.get('id');

    if (!knowledgeId) {
      return NextResponse.json({
        error: 'knowledge id is required'
      }, { status: 400 });
    }

    const auth = await authorizeProjectAccess(projectId, { requireAdmin: true });
    if (auth.error) {
      return auth.error;
    }

    const { serviceSupabase } = auth;

    const { error } = await serviceSupabase
      .from('aloa_project_knowledge')
      .update({ is_current: false })
      .eq('id', knowledgeId)
      .eq('project_id', projectId);

    if (error) {
      return handleDatabaseError(error, 'Failed to delete knowledge');
    }

    await serviceSupabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
