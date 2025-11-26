export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const STYLE_ANALYSIS_PROMPT = `You are an expert writing style analyst. Analyze the following writing samples and extract a comprehensive style guide that can be used to replicate this writing style.

Provide your analysis in the following JSON format:

{
  "style_summary": "A 2-3 sentence overview of the overall writing style",
  "style_attributes": {
    "tone": "Description of the overall tone (e.g., professional yet approachable, authoritative, friendly)",
    "vocabulary_level": "Description of word choice complexity and patterns",
    "sentence_structure": "How sentences are typically constructed",
    "paragraph_length": "Typical paragraph length and structure",
    "formatting_preferences": "How content is formatted (bullets, headers, etc.)",
    "voice": "The narrative voice used (first person, third person, etc.)",
    "punctuation_style": "Notable punctuation patterns",
    "emoji_usage": "none/minimal/moderate/frequent",
    "key_phrases": ["Array of characteristic phrases or expressions used"],
    "writing_patterns": "Any notable recurring patterns in the writing",
    "engagement_style": "How the writer engages with the reader"
  },
  "tone_keywords": ["Array", "of", "3-5", "tone", "descriptors"],
  "voice_perspective": "first_person_singular OR first_person_plural OR third_person OR mixed",
  "formality_level": "very_formal OR formal OR neutral OR casual OR very_casual",
  "do_not_use": ["Phrases or patterns that are notably ABSENT and should be avoided"],
  "always_use": ["Patterns or approaches that should ALWAYS be replicated"],
  "analysis_confidence": 0.85
}

The analysis_confidence should be:
- 0.9-1.0 if samples are consistent and provide clear style patterns
- 0.7-0.9 if samples show some variation but patterns are identifiable
- 0.5-0.7 if samples are limited or show significant variation
- Below 0.5 if insufficient data to make reliable style recommendations

Be specific and actionable in your descriptions. The goal is for an AI to be able to replicate this exact writing style.

WRITING SAMPLES TO ANALYZE:
`;

// POST - Analyze writing samples and generate/update style guide
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {}
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Verify permissions
    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'project_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Fetch all active writing samples for this project
    const { data: samples, error: samplesError } = await supabase
      .from('aloa_project_writing_samples')
      .select('id, file_name, extracted_text, sample_type, word_count')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (samplesError) {
      console.error('Error fetching samples:', samplesError);
      return NextResponse.json({ error: 'Failed to fetch writing samples' }, { status: 500 });
    }

    if (!samples || samples.length === 0) {
      return NextResponse.json({
        error: 'No writing samples found. Please upload at least one writing sample first.'
      }, { status: 400 });
    }

    // Combine samples into analysis text (limit to ~50k chars to stay within context)
    let totalChars = 0;
    const maxChars = 50000;
    const samplesText = [];

    for (const sample of samples) {
      if (totalChars + sample.extracted_text.length > maxChars) {
        // Truncate this sample to fit
        const remaining = maxChars - totalChars;
        if (remaining > 500) {
          samplesText.push(`\n--- Sample: ${sample.file_name} (${sample.sample_type}) [truncated] ---\n${sample.extracted_text.substring(0, remaining)}...`);
        }
        break;
      }
      samplesText.push(`\n--- Sample: ${sample.file_name} (${sample.sample_type}, ${sample.word_count} words) ---\n${sample.extracted_text}`);
      totalChars += sample.extracted_text.length;
    }

    // Call Claude to analyze the writing style
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: STYLE_ANALYSIS_PROMPT + samplesText.join('\n')
        }
      ]
    });

    // Extract the JSON from Claude's response
    const responseText = message.content[0].text;
    let styleAnalysis;

    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        styleAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({
        error: 'Failed to parse style analysis. Please try again.'
      }, { status: 500 });
    }

    // Upsert the writing style record
    const { data: writingStyle, error: upsertError } = await supabase
      .from('aloa_project_writing_style')
      .upsert({
        project_id: projectId,
        style_summary: styleAnalysis.style_summary,
        style_attributes: styleAnalysis.style_attributes,
        tone_keywords: styleAnalysis.tone_keywords,
        voice_perspective: styleAnalysis.voice_perspective,
        formality_level: styleAnalysis.formality_level,
        do_not_use: styleAnalysis.do_not_use || [],
        always_use: styleAnalysis.always_use || [],
        last_analyzed_at: new Date().toISOString(),
        samples_analyzed: samples.length,
        analysis_confidence: styleAnalysis.analysis_confidence || 0.7,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error saving style analysis:', upsertError);
      return NextResponse.json({ error: 'Failed to save style analysis' }, { status: 500 });
    }

    return NextResponse.json({
      writingStyle,
      samplesAnalyzed: samples.length,
      message: `Successfully analyzed ${samples.length} writing sample(s)`
    });

  } catch (error) {
    console.error('Error in POST /api/project-writing-style/analyze:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
