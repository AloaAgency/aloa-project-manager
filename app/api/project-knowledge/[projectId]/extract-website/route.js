import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as cheerio from 'cheerio';

async function extractTextFromHTML(html) {
  const $ = cheerio.load(html);

  $('script').remove();
  $('style').remove();
  $('noscript').remove();

  const content = {
    title: $('title').text() || $('h1').first().text() || '',
    description: $('meta[name="description"]').attr('content') || '',
    keywords: $('meta[name="keywords"]').attr('content') || '',

    headings: {
      h1: [],
      h2: [],
      h3: []
    },

    navigation: [],

    mainContent: '',

    images: [],

    colors: new Set(),
    fonts: new Set(),

    structuredData: []
  };

  $('h1').each((i, el) => content.headings.h1.push($(el).text().trim()));
  $('h2').each((i, el) => content.headings.h2.push($(el).text().trim()));
  $('h3').each((i, el) => content.headings.h3.push($(el).text().trim()));

  $('nav a, header a').each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href');
    if (text && href) {
      content.navigation.push({ text, href });
    }
  });

  $('main, article, [role="main"], .content, #content').each((i, el) => {
    content.mainContent += $(el).text().trim() + '\n';
  });

  if (!content.mainContent) {
    content.mainContent = $('body').text().trim();
  }

  $('img').each((i, el) => {
    const alt = $(el).attr('alt') || '';
    const src = $(el).attr('src') || '';
    if (src) {
      content.images.push({ src, alt });
    }
  });

  $('[style]').each((i, el) => {
    const style = $(el).attr('style') || '';

    const colorMatch = style.match(/color:\s*([^;]+)/gi);
    if (colorMatch) {
      colorMatch.forEach(match => {
        const color = match.replace(/color:\s*/i, '').trim();
        content.colors.add(color);
      });
    }

    const fontMatch = style.match(/font-family:\s*([^;]+)/gi);
    if (fontMatch) {
      fontMatch.forEach(match => {
        const font = match.replace(/font-family:\s*/i, '').trim();
        content.fonts.add(font);
      });
    }
  });

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      content.structuredData.push(data);
    } catch (e) {

    }
  });

  content.colors = Array.from(content.colors);
  content.fonts = Array.from(content.fonts);

  return content;
}

function analyzeContent(content) {
  const analysis = {
    hasNavigation: content.navigation.length > 0,
    pageCount: content.navigation.length,
    hasStructuredData: content.structuredData.length > 0,
    imageCount: content.images.length,
    hasColorScheme: content.colors.length > 0,
    hasFonts: content.fonts.length > 0,
    contentLength: content.mainContent.length,
    headingStructure: {
      h1Count: content.headings.h1.length,
      h2Count: content.headings.h2.length,
      h3Count: content.headings.h3.length
    },

    estimatedIndustry: null,
    estimatedPurpose: null,
    primaryColors: content.colors.slice(0, 5),
    primaryFonts: content.fonts.slice(0, 3)
  };

  const contentLower = content.mainContent.toLowerCase();

  if (contentLower.includes('product') || contentLower.includes('shop') || contentLower.includes('cart')) {
    analysis.estimatedPurpose = 'e-commerce';
  } else if (contentLower.includes('blog') || contentLower.includes('article') || contentLower.includes('post')) {
    analysis.estimatedPurpose = 'blog';
  } else if (contentLower.includes('portfolio') || contentLower.includes('work') || contentLower.includes('project')) {
    analysis.estimatedPurpose = 'portfolio';
  } else if (contentLower.includes('about') || contentLower.includes('service') || contentLower.includes('team')) {
    analysis.estimatedPurpose = 'corporate';
  }

  return analysis;
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`Extracting website content from ${url} for project ${projectId}`);

    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AloaBot/1.0; +https://aloa.co)'
        }
      });
    } catch (fetchError) {
      console.error('Error fetching website:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch website',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'Website returned error',
        status: response.status
      }, { status: 400 });
    }

    const html = await response.text();
    const extractedContent = await extractTextFromHTML(html);
    const analysis = analyzeContent(extractedContent);

    const knowledgeItems = [];

    if (extractedContent.title || extractedContent.description) {
      knowledgeItems.push({
        project_id: projectId,
        source_type: 'website_content',
        source_id: url,
        source_name: `${extractedContent.title || 'Website'} - Metadata`,
        source_url: url,
        content_type: 'structured_data',
        content: JSON.stringify({
          title: extractedContent.title,
          description: extractedContent.description,
          keywords: extractedContent.keywords
        }),
        content_summary: `Website metadata from ${new URL(url).hostname}`,
        category: 'business_goals',
        tags: ['website', 'metadata', 'seo'],
        importance_score: 9,
        extracted_by: 'system',
        extraction_confidence: 0.95,
        processed_at: new Date().toISOString(),
        is_current: true
      });
    }

    if (extractedContent.navigation.length > 0) {
      knowledgeItems.push({
        project_id: projectId,
        source_type: 'website_content',
        source_id: url,
        source_name: `${extractedContent.title || 'Website'} - Navigation`,
        source_url: url,
        content_type: 'structured_data',
        content: JSON.stringify(extractedContent.navigation),
        content_summary: `Site structure with ${extractedContent.navigation.length} navigation items`,
        category: 'functionality',
        tags: ['navigation', 'sitemap', 'structure'],
        importance_score: 8,
        extracted_by: 'system',
        extraction_confidence: 0.9,
        processed_at: new Date().toISOString(),
        is_current: true
      });
    }

    if (extractedContent.colors.length > 0 || extractedContent.fonts.length > 0) {
      knowledgeItems.push({
        project_id: projectId,
        source_type: 'website_content',
        source_id: url,
        source_name: `${extractedContent.title || 'Website'} - Design Elements`,
        source_url: url,
        content_type: 'preferences',
        content: JSON.stringify({
          colors: extractedContent.colors,
          fonts: extractedContent.fonts
        }),
        content_summary: `Current design uses ${extractedContent.colors.length} colors and ${extractedContent.fonts.length} font families`,
        category: 'design_preferences',
        tags: ['colors', 'typography', 'design'],
        importance_score: 7,
        extracted_by: 'system',
        extraction_confidence: 0.85,
        processed_at: new Date().toISOString(),
        is_current: true
      });
    }

    const contentSample = extractedContent.mainContent.substring(0, 2000);
    if (contentSample) {
      knowledgeItems.push({
        project_id: projectId,
        source_type: 'website_content',
        source_id: url,
        source_name: `${extractedContent.title || 'Website'} - Content`,
        source_url: url,
        content_type: 'text',
        content: contentSample,
        content_summary: `Main content from ${new URL(url).hostname} (${extractedContent.mainContent.length} characters total)`,
        category: 'content_strategy',
        tags: ['content', 'copy', 'text', analysis.estimatedPurpose].filter(Boolean),
        importance_score: 8,
        extracted_by: 'system',
        extraction_confidence: 0.9,
        processed_at: new Date().toISOString(),
        is_current: true
      });
    }

    knowledgeItems.push({
      project_id: projectId,
      source_type: 'website_content',
      source_id: url,
      source_name: `${extractedContent.title || 'Website'} - Analysis`,
      source_url: url,
      content_type: 'structured_data',
      content: JSON.stringify(analysis),
      content_summary: `Website analysis: ${analysis.estimatedPurpose || 'general'} site with ${analysis.pageCount} pages`,
      category: 'technical_specs',
      tags: ['analysis', 'structure', analysis.estimatedPurpose].filter(Boolean),
      importance_score: 6,
      extracted_by: 'system',
      extraction_confidence: 0.8,
      processed_at: new Date().toISOString(),
      is_current: true
    });

    if (knowledgeItems.length > 0) {
      const { error: insertError } = await supabase
        .from('aloa_project_knowledge')
        .insert(knowledgeItems);

      if (insertError) {
        console.error('Error inserting knowledge items:', insertError);
        return NextResponse.json({
          error: 'Failed to save knowledge',
          details: insertError.message
        }, { status: 500 });
      }
    }

    await supabase
      .from('aloa_knowledge_extraction_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('source_id', url)
      .eq('source_type', 'website_content')
      .eq('project_id', projectId);

    await supabase
      .from('aloa_ai_context_cache')
      .delete()
      .eq('project_id', projectId);

    return NextResponse.json({
      success: true,
      url,
      extracted: {
        title: extractedContent.title,
        itemsCreated: knowledgeItems.length,
        analysis
      }
    });
  } catch (error) {
    console.error('Error in website extraction:', error);

    await supabase
      .from('aloa_knowledge_extraction_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        attempts: supabase.raw('attempts + 1')
      })
      .eq('source_id', request.body.url)
      .eq('source_type', 'website_content')
      .eq('project_id', params.projectId);

    return NextResponse.json({
      error: 'Failed to extract website content',
      details: error.message
    }, { status: 500 });
  }
}