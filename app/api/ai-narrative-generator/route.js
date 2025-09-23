import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You are an expert web content strategist and copywriter. Your task is to transform form responses into structured, website-ready narrative content.

You will receive form data that contains information about a specific webpage (homepage, about page, services page, etc.). Your job is to:

1. Analyze the form responses to understand the client's needs, preferences, and key messages
2. Create compelling, structured content sections appropriate for the specific page type
3. Write in a tone and style that aligns with the client's brand (if specified in responses)
4. Organize content in a logical hierarchy that supports both user experience and visual design
5. Ensure all content is web-optimized, scannable, and engaging

CRITICAL RULES FOR ACCURACY:
- YOU MUST prioritize using the EXACT language, phrases, and information provided in the form responses
- NEVER invent company names, product names, statistics, facts, or claims not explicitly stated in the responses
- When specific details are missing, use placeholder language like "[specific detail to be provided]" or "[to be determined]"
- Preserve all factual claims exactly as written by the client - do not embellish or modify them
- If the client provides specific wording or phrasing, incorporate it directly into the narrative
- Only add transitional language and structural elements to connect the client's actual content
- When in doubt, quote directly from the form responses rather than paraphrasing

IMPORTANCE WEIGHTING:
- When multiple stakeholders provide conflicting responses, prioritize based on their importance scores
- Responses with higher importance scores (8-10) should be considered authoritative
- Lower importance responses (1-4) can provide supplementary details but should not override higher-priority input
- For CEO/decision-maker responses (importance 9-10), their preferences should be treated as final
- When responses align, combine them; when they conflict, defer to the highest importance stakeholder

IMPORTANT GUIDELINES:
- Each section should have a clear purpose and hierarchy
- Use the client's actual language and terminology EXACTLY as provided
- Maintain factual accuracy - if information isn't in the responses, don't make it up
- Create content that designers can easily translate into visual layouts
- Include appropriate calls-to-action based on the page type
- Keep paragraphs concise and web-friendly
- Structure content to support SEO best practices
- Mark any gaps in information clearly for later completion

OUTPUT FORMAT:
Return a JSON object where each key is a section name (e.g., "Hero Section", "Value Proposition", "Features Overview") and each value is the narrative content for that section. The sections should be in logical order for the page type.

Example structure for a homepage:
{
  "Hero Section": "Welcome message using client's exact value proposition...",
  "Problem We Solve": "Description using client's specific problem statements...",
  "Our Solution": "How the product/service addresses these needs (as described by client)...",
  "Key Benefits": "The exact benefits mentioned in form responses...",
  "Social Proof": "Specific testimonials or credentials provided...",
  "Call to Action": "Action items mentioned by the client..."
}

Remember: Accuracy and faithfulness to the source material is paramount. It's better to have placeholder text for missing information than to invent facts.`;

export async function POST(request) {
  try {
    const { formId, pageName, projectId } = await request.json();

    if (!formId) {

      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get the form and its responses - check aloa_forms first (where project forms are stored)
    let form = null;
    let responses = [];
    let fields = [];

    // Try aloa_forms table first (this is where project forms are actually stored)

    let { data: aloaForm, error: aloaFormError } = await supabase
      .from('aloa_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (aloaForm) {
      form = aloaForm;

      // Get fields for this form
      const { data: formFields } = await supabase
        .from('aloa_form_fields')
        .select('*')
        .eq('aloa_form_id', formId)
        .order('field_order', { ascending: true });

      fields = formFields || [];

      // Get responses from aloa_form_responses with stakeholder importance
      const { data: aloaResponses } = await supabase
        .from('aloa_form_responses')
        .select(`
          *,
          stakeholder:aloa_project_stakeholders(
            id,
            role,
            importance_score,
            user:aloa_user_profiles(
              name,
              email,
              role
            )
          )
        `)
        .eq('aloa_form_id', formId)
        .order('stakeholder_importance', { ascending: false }) // Order by importance first
        .order('submitted_at', { ascending: false }); // Then by submission time

      responses = aloaResponses || [];

      // Log the first response if it exists
      if (responses.length > 0) {
        // First response available for processing
      }
    } else {
      // Try aloa_project_forms table (legacy)

      const { data: projectForm, error: projectFormError } = await supabase
        .from('aloa_project_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (projectForm) {
        form = projectForm;
        // Get responses from aloa_project_responses
        const { data: projectResponses } = await supabase
          .from('aloa_project_responses')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false });
        responses = projectResponses || [];
        fields = projectForm.fields_structure || [];
      } else {
        // Try regular forms table as last resort

        const { data: regularForm, error: regularFormError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (!regularForm) {

          // Create mock form data for testing
          form = {
            title: 'Test Form',
            description: 'Test form for development'
          };
          fields = [];
          responses = [];
        } else {
          form = regularForm;
          fields = regularForm.fields_structure || [];
          // Get responses from responses table
          const { data: regularResponses } = await supabase
            .from('responses')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });
          responses = regularResponses || [];
        }
      }
    }

    // Get project knowledge if available
    let projectContext = '';
    if (projectId) {
      try {
        const contextResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/project-knowledge/${projectId}/context`,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          if (contextData.context) {
            projectContext = `\n\nPROJECT CONTEXT:\n${contextData.context}`;
          }
        }
      } catch (error) {

      }
    }

    // Prepare the prompt with form data
    // Create a detailed breakdown of questions and answers
    let formContent = `PAGE TYPE: ${pageName || 'Homepage'}\n\n`;
    formContent += `FORM TITLE: ${form.title || 'Untitled Form'}\n`;
    if (form.description) {
      formContent += `FORM DESCRIPTION: ${form.description}\n`;
    }
    formContent += '\n';

    // Process multiple responses with importance weighting
    let consolidatedResponses = {};
    let responsesByImportance = [];

    // If we have no responses, create sample content for testing
    if (responses.length === 0) {

      formContent += 'SAMPLE CONTENT FOR TESTING:\n';
      formContent += '\nBUSINESS NAME: Glid Digital Solutions\n';
      formContent += '\nVALUE PROPOSITION: We help businesses transform their digital presence with modern, user-focused web experiences.\n';
      formContent += '\nTARGET AUDIENCE: Small to medium businesses looking to improve their online presence.\n';
      formContent += '\nKEY SERVICES: Web Design, Development, Digital Strategy\n';
      formContent += '\nBRAND TONE: Professional, approachable, innovative\n';
    } else {
      // Process multiple responses with stakeholder importance
      formContent += 'FORM RESPONSES (Weighted by Stakeholder Importance):\n\n';

      // Group responses by stakeholder importance
      responses.forEach(response => {
        const importance = response.stakeholder_importance || 5;
        const stakeholderInfo = response.stakeholder || {};
        const responseData = response.responses || response.data || {};

        responsesByImportance.push({
          importance,
          stakeholderName: stakeholderInfo.user?.full_name || 'Anonymous',
          stakeholderRole: stakeholderInfo.role || 'Unknown',
          data: responseData
        });
      });

      // Sort by importance (highest first)
      responsesByImportance.sort((a, b) => b.importance - a.importance);

      // If we have multiple responses, show them with importance context
      if (responsesByImportance.length > 1) {
        formContent += 'STAKEHOLDER RESPONSES (Prioritize higher importance scores when conflicts arise):\n\n';

        responsesByImportance.forEach((resp, idx) => {
          formContent += `--- STAKEHOLDER ${idx + 1} ---\n`;
          formContent += `Name: ${resp.stakeholderName}\n`;
          formContent += `Role: ${resp.stakeholderRole}\n`;
          formContent += `IMPORTANCE SCORE: ${resp.importance}/10 ${resp.importance >= 8 ? '(HIGH PRIORITY)' : resp.importance <= 3 ? '(LOW PRIORITY)' : '(MEDIUM PRIORITY)'}\n\n`;

          // Process each field in this response
          if (fields && fields.length > 0) {
            fields.forEach(field => {
              const fieldName = field.field_name || field.field_label?.toLowerCase().replace(/\s+/g, '_');
              const answer = resp.data[fieldName] || resp.data[field.field_label] || resp.data[field.id];

              if (answer) {
                formContent += `${field.field_label}: ${typeof answer === 'object' ? JSON.stringify(answer, null, 2) : answer}\n`;
              }
            });
          } else {
            // Just output all data
            Object.entries(resp.data).forEach(([key, value]) => {
              if (value && !key.startsWith('_') && !['id', 'created_at', 'updated_at', 'submitted_at'].includes(key)) {
                formContent += `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}\n`;
              }
            });
          }
          formContent += '\n';
        });

        formContent += 'CONSOLIDATION GUIDANCE: When responses conflict, prioritize the highest importance score. CEO/decision-maker responses (9-10) should override all others.\n\n';
      } else {
        // Single response - process normally
        const singleResponse = responsesByImportance[0];

        if (fields && fields.length > 0) {
          fields.forEach(field => {
            const fieldName = field.field_name || field.field_label?.toLowerCase().replace(/\s+/g, '_');
            const answer = singleResponse.data[fieldName] || singleResponse.data[field.field_label] || singleResponse.data[field.id];

            if (answer) {
              formContent += `\nQUESTION: ${field.field_label}\n`;
              formContent += `ANSWER: ${typeof answer === 'object' ? JSON.stringify(answer, null, 2) : answer}\n`;
            }
          });
        } else {
          Object.entries(singleResponse.data).forEach(([key, value]) => {
            if (value && !key.startsWith('_') && !['id', 'created_at', 'updated_at', 'submitted_at'].includes(key)) {
              formContent += `\n${key.replace(/_/g, ' ').toUpperCase()}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}\n`;
            }
          });
        }
      }
    }

    // Call Claude to generate narrative content
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0.7,
      system: SYSTEM_PROMPT + projectContext,
      messages: [
        {
          role: 'user',
          content: `Generate structured narrative content for a ${pageName || 'homepage'} based on these form responses:\n\n${formContent}\n\nIMPORTANT REQUIREMENTS:\n1. Use the EXACT wording, facts, and claims from the form responses above\n2. DO NOT invent any company details, statistics, or features not mentioned\n3. Preserve the client's specific language and terminology\n4. If information is missing, use placeholders like "[to be provided]"\n5. Focus on organizing and structuring their actual content, not creating new content\n\nCreate website-ready content sections that faithfully represent these responses. Return ONLY a JSON object with section names as keys and narrative content as values. The content should be their words, professionally organized.`
        }
      ]
    });

    // Parse the response
    let narrativeContent;
    try {
      const responseText = message.content[0].text;
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        narrativeContent = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, create a basic structure
        narrativeContent = {
          "Main Content": responseText
        };
      }
    } catch (parseError) {

      // Fallback to a structured format
      narrativeContent = {
        "Introduction": "Welcome to our " + (pageName || 'page'),
        "Main Content": message.content[0].text.substring(0, 500) + '...',
        "Call to Action": "Get in touch with us to learn more"
      };
    }

    // Ensure we have a valid structure
    if (!narrativeContent || typeof narrativeContent !== 'object') {
      narrativeContent = {
        "Content": "Generated content based on your form responses"
      };
    }

    return NextResponse.json(narrativeContent);

  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to generate narrative content' },
      { status: 500 }
    );
  }
}