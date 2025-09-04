import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// GET endpoint to retrieve cached analysis
export async function GET(request, { params }) {
  try {
    const { formId } = params;
    
    // Check if we have a cached analysis
    const { data: cachedAnalysis, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (cachedAnalysis && !error) {
      return NextResponse.json({ analysis: cachedAnalysis.analysis });
    }
    
    return NextResponse.json({ analysis: null });
  } catch (error) {
    console.error('Error fetching cached analysis:', error);
    return NextResponse.json({ analysis: null });
  }
}

// POST endpoint to generate new analysis
export async function POST(request, { params }) {
  try {
    const { formId } = params;
    
    // Fetch form and responses
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields (*)
      `)
      .eq('id', formId)
      .single();
    
    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }
    
    const { data: responses, error: responsesError } = await supabase
      .from('form_responses')
      .select('*')
      .eq('form_id', formId);
    
    if (responsesError || !responses || responses.length === 0) {
      return NextResponse.json(
        { error: 'No responses found' },
        { status: 404 }
      );
    }
    
    // Prepare data for AI analysis
    const formStructure = {
      title: form.title,
      description: form.description,
      fields: form.form_fields.map(field => ({
        label: field.field_label,
        type: field.field_type,
        name: field.field_name,
        options: field.options
      }))
    };
    
    const responseData = responses.map(r => r.response_data);
    
    // Create the prompt for Claude
    const prompt = `You are an expert analyst tasked with analyzing survey/form responses to identify patterns, consensus, conflicts, and actionable insights.

Form Title: ${formStructure.title}
Form Description: ${formStructure.description || 'N/A'}
Total Responses: ${responses.length}

Form Structure:
${JSON.stringify(formStructure.fields, null, 2)}

Response Data:
${JSON.stringify(responseData, null, 2)}

Please analyze these responses and provide a comprehensive analysis in the following JSON format:

{
  "executiveSummary": "A 2-3 sentence executive summary of the key findings",
  "totalResponses": ${responses.length},
  "consensusScore": <0-100 percentage representing overall agreement level>,
  "confidence": <0-100 percentage representing your confidence in the analysis>,
  "consensusAreas": [
    {
      "topic": "Brief topic name",
      "description": "What respondents agree on",
      "agreementPercentage": <percentage who agree>
    }
  ],
  "conflictAreas": [
    {
      "topic": "Brief topic name",
      "viewpoints": [
        {
          "percentage": <percentage with this view>,
          "description": "Description of this viewpoint"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "title": "Brief recommendation title",
      "description": "Detailed actionable recommendation",
      "priority": "high|medium|low"
    }
  ],
  "stakeholderMessage": "A professional message to stakeholders summarizing the consensus and recommended next steps (2-3 sentences)"
}

Important guidelines:
1. Be specific and reference actual response data
2. Identify both explicit agreements and implicit patterns
3. For conflicts, clearly show the different viewpoints and their prevalence
4. Recommendations should be actionable and based on the data
5. The stakeholder message should be diplomatic and action-oriented
6. Consider both quantitative data (ratings, selections) and qualitative data (text responses)
7. Look for themes across different questions that might be related`;

    // Call Claude API
    const completion = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Parse the AI response
    let analysis;
    try {
      // Extract JSON from the response
      const responseText = completion.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract JSON from response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Provide a fallback analysis
      analysis = {
        executiveSummary: "Analysis is being processed. Please try again.",
        totalResponses: responses.length,
        consensusScore: 0,
        confidence: 0,
        consensusAreas: [],
        conflictAreas: [],
        recommendations: [],
        stakeholderMessage: "Analysis in progress."
      };
    }
    
    // Store the analysis in the database
    const { error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        form_id: formId,
        analysis: analysis,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error caching analysis:', insertError);
      // Continue even if caching fails
    }
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}