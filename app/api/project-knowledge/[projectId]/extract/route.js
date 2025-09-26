import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { sourceType, sourceId, triggerType } = body;

    const extractor = new KnowledgeExtractor(projectId);
    let result = null;

    switch (sourceType) {
      case 'form_response':
        result = await extractor.extractFromFormResponse(sourceId);
        break;

      case 'applet_interaction':
        result = await extractor.extractFromAppletInteraction(sourceId);
        break;

      case 'file_document':
        result = await extractor.extractFromFile(sourceId);
        break;

      case 'project_metadata':
        result = await extractor.extractFromProject();
        await extractor.processExtractionQueue();
        break;

      case 'website_content':
        await extractor.queueWebsiteExtraction(sourceId);
        result = { queued: true, url: sourceId };
        break;

      case 'process_queue':
        await extractor.processExtractionQueue();
        result = { processed: true };
        break;

      default:
        return NextResponse.json({
          error: `Unknown source type: ${sourceType}`
        }, { status: 400 });
    }

    await supabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json({
      success: true,
      sourceType,
      sourceId,
      result
    });
  } catch (error) {

    return NextResponse.json({
      error: 'Failed to extract knowledge',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    const { data: queueItems, error } = await supabase
      .from('aloa_knowledge_extraction_queue')
      .select('*')
      .eq('project_id', projectId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    const stats = {
      pending: queueItems.filter(i => i.status === 'pending').length,
      processing: queueItems.filter(i => i.status === 'processing').length,
      completed: queueItems.filter(i => i.status === 'completed').length,
      failed: queueItems.filter(i => i.status === 'failed').length
    };

    return NextResponse.json({
      queue: queueItems,
      stats
    });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
