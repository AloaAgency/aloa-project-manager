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
    const {
      formId = null,
      copyCollectionAppletId = null,
      copyCollectionAppletIds = [],
      pageName,
      pageTypePreset = null,
      narrativeLength = 'balanced',
      projectId
    } = await request.json();

    const hasForm = Boolean(formId);

    const normalizedCopyCollectionIds = new Set();
    if (copyCollectionAppletId) {
      normalizedCopyCollectionIds.add(copyCollectionAppletId);
    }
    if (Array.isArray(copyCollectionAppletIds)) {
      copyCollectionAppletIds
        .filter(Boolean)
        .forEach(id => normalizedCopyCollectionIds.add(id));
    }

    const finalCopyCollectionIds = Array.from(normalizedCopyCollectionIds);
    const hasCopyCollections = finalCopyCollectionIds.length > 0;

    if (!hasForm && !hasCopyCollections) {
      return NextResponse.json({ error: 'Select a form or at least one copy collection applet before generating a narrative.' }, { status: 400 });
    }

    const supabase = createClient();

    const lengthGuides = {
      succinct: {
        label: 'Succinct (~300 words)',
        targetRange: 'around 300 words',
        reminder: 'Keep copy tight and scannable while covering the essentials.'
      },
      balanced: {
        label: 'Balanced (~700 words)',
        targetRange: 'roughly 600-900 words',
        reminder: 'Provide enough depth for persuasion while staying focused.'
      },
      comprehensive: {
        label: 'Comprehensive (1200+ words)',
        targetRange: 'at least 1200 words',
        reminder: 'Expand each section with context, proof points, and supporting detail.'
      }
    };

    const pageTypeGuidesMap = {
      homepage: {
        title: 'Homepage',
        focus: 'Hook quickly, reinforce value proposition, guide to next actions.',
        notes: 'Hero, benefits, social proof, CTAs. Each section should connect back to the primary offer.'
      },
      technology: {
        title: 'Technology Page',
        focus: 'Explain technical differentiators with credibility and structure.',
        notes: 'Use modules for capabilities, architecture, integrations, and proof (case studies, certifications).'
      },
      use_case: {
        title: 'Use Cases Page',
        focus: 'Frame problems, solutions, and business outcomes for target personas.',
        notes: 'Present scenarios, before/after stories, and measurable impact.'
      },
      about: {
        title: 'About Us Page',
        focus: 'Build trust through story, mission, leadership, and credentials.',
        notes: 'Highlight team expertise, milestones, recognitions, and what differentiates the company culture.'
      },
      blog: {
        title: 'Blog / Resources',
        focus: 'Deliver authoritative, long-form insight that demonstrates expertise.',
        notes: 'Use structured headings, deep explanations, supporting data, and clear takeaways.'
      }
    };

    // Build stakeholder lookup for weighting and attribution
    const stakeholderMap = {};
    if (projectId) {
      const { data: stakeholders } = await supabase
        .from('aloa_project_stakeholders')
        .select('id, user_id, name, role, importance_score')
        .eq('project_id', projectId);

      stakeholders?.forEach(stakeholder => {
        if (stakeholder.user_id) {
          stakeholderMap[stakeholder.user_id] = stakeholder;
        }
      });
    }

    // Capture the client's tone of voice selection (if available)
    let toneDirective = '';
    if (projectId) {
      const { data: toneRecords } = await supabase
        .from('aloa_project_knowledge')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_current', true)
        .ilike('source_name', '%Tone of Voice%')
        .order('processed_at', { ascending: false })
        .limit(1);

      const toneRecord = toneRecords?.[0];
      if (toneRecord?.content) {
        try {
          const parsedTone = JSON.parse(toneRecord.content);
          const toneName = parsedTone.toneName || parsedTone.tone || null;
          const educationLevelName = parsedTone.educationLevelName || parsedTone.educationLevel || null;

          const parts = [];
          if (toneName) parts.push(`Primary Tone: ${toneName}`);
          if (educationLevelName) parts.push(`Reading Level: ${educationLevelName}`);
          toneDirective = parts.join(' | ');
        } catch (error) {
          // Ignore parse failures; tone directive will simply be omitted
        }
      }
    }

    // ---------------------------------------------------------------------
    // Primary form responses (if a form is configured)
    // ---------------------------------------------------------------------
    let form = null;
    let fields = [];
    let responses = [];

    if (hasForm) {
      const { data: aloaForm } = await supabase
        .from('aloa_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (aloaForm) {
        form = aloaForm;

        const { data: formFields } = await supabase
          .from('aloa_form_fields')
          .select('*')
          .eq('aloa_form_id', formId)
          .order('field_order', { ascending: true });

        fields = formFields || [];

        const { data: aloaResponses } = await supabase
          .from('aloa_form_responses')
          .select(`
            *,
            stakeholder:aloa_project_stakeholders(
              id,
              name,
              role,
              importance_score
            )
          `)
          .eq('aloa_form_id', formId)
          .order('stakeholder_importance', { ascending: false })
          .order('submitted_at', { ascending: false });

        responses = aloaResponses || [];
      }
    }

    // ---------------------------------------------------------------------
    // Copy collection applet submissions
    // ---------------------------------------------------------------------
    const copyContributions = [];
    if (hasCopyCollections) {
      const { data: copyInteractions } = await supabase
        .from('aloa_applet_interactions')
        .select(`
          id,
          applet_id,
          interaction_type,
          user_id,
          stakeholder_importance,
          stakeholder_id,
          data,
          created_at,
          user:aloa_user_profiles(id, full_name, email, role)
        `)
        .in('applet_id', finalCopyCollectionIds)
        .order('created_at', { ascending: false });

      const seenContributors = new Set();

      copyInteractions?.forEach(interaction => {
        const progress = interaction.data?.form_progress || {};
        const copyText = typeof progress.uploadedContent === 'string'
          ? progress.uploadedContent.trim()
          : '';
        const fileName = progress.uploadedFileName || null;
        const hasUsefulCopy = Boolean(copyText) || Boolean(fileName) || Boolean(progress.formCompleted);

        if (!hasUsefulCopy) {
          return;
        }

        const contributorKey = interaction.user_id || progress.userId || `${interaction.applet_id}-${interaction.id}`;
        if (seenContributors.has(contributorKey)) {
          return;
        }
        seenContributors.add(contributorKey);

        const stakeholderRecord = (interaction.user_id && stakeholderMap[interaction.user_id]) || (progress.userId && stakeholderMap[progress.userId]) || null;

        const importance = interaction.stakeholder_importance
          || progress.stakeholderImportance
          || stakeholderRecord?.importance_score
          || 5;

        const stakeholderName = stakeholderRecord?.name
          || interaction.user?.full_name
          || 'Client Stakeholder';
        const stakeholderRole = stakeholderRecord?.role
          || interaction.user?.role
          || 'Stakeholder';

        const truncatedCopy = copyText && copyText.length > 2000
          ? `${copyText.substring(0, 2000)}...`
          : copyText;

        copyContributions.push({
          importance,
          stakeholderName,
          stakeholderRole,
          copyText: truncatedCopy,
          fileName,
          mode: progress.mode || (progress.formCompleted ? 'form' : 'upload'),
          createdAt: interaction.created_at
        });
      });

      copyContributions.sort((a, b) => b.importance - a.importance || new Date(a.createdAt) - new Date(b.createdAt));
    }

    // ---------------------------------------------------------------------
    // Build narrative context string
    // ---------------------------------------------------------------------
    const lengthGuide = lengthGuides[narrativeLength] || lengthGuides.balanced;
    const pageTypeGuide = pageTypePreset ? pageTypeGuidesMap[pageTypePreset] : null;

    let formContent = `PAGE NAME: ${pageName || 'Page'}\n`;
    if (pageTypeGuide) {
      formContent += `PAGE TYPE PRESET: ${pageTypeGuide.title}\nFOCUS: ${pageTypeGuide.focus}\nNOTES: ${pageTypeGuide.notes}\n`;
    }
    formContent += `TARGET LENGTH: ${lengthGuide.targetRange}\n\n`;

    if (form) {
      formContent += `FORM TITLE: ${form.title || 'Untitled Form'}\n`;
      if (form.description) {
        formContent += `FORM DESCRIPTION: ${form.description}\n`;
      }
      formContent += '\n';
    } else if (hasForm) {
      formContent += 'WARNING: The selected form could not be loaded. Falling back to copy collection submissions.\n\n';
    } else {
      formContent += 'Primary data source: Copy collection submissions. No structured form selected.\n\n';
    }

    const responsesByImportance = [];

    if (responses.length > 0) {
      formContent += 'FORM RESPONSES (Weighted by Stakeholder Importance):\n\n';

      responses.forEach(response => {
        const responseData = response.responses || response.data || {};
        responsesByImportance.push({
          importance: response.stakeholder_importance || 5,
          stakeholderName: response.stakeholder?.name || 'Anonymous',
          stakeholderRole: response.stakeholder?.role || 'Unknown',
          data: responseData
        });
      });

      responsesByImportance.sort((a, b) => b.importance - a.importance);

      if (responsesByImportance.length > 1) {
        formContent += 'STAKEHOLDER RESPONSES (Prioritize higher importance scores when conflicts arise):\n\n';

        responsesByImportance.forEach((resp, index) => {
          formContent += `--- STAKEHOLDER ${index + 1} ---\n`;
          formContent += `Name: ${resp.stakeholderName}\n`;
          formContent += `Role: ${resp.stakeholderRole}\n`;
          formContent += `IMPORTANCE SCORE: ${resp.importance}/10 ${resp.importance >= 8 ? '(HIGH PRIORITY)' : resp.importance <= 3 ? '(LOW PRIORITY)' : '(MEDIUM PRIORITY)'}\n\n`;

          if (fields.length > 0) {
            fields.forEach(field => {
              const fieldName = field.field_name || field.field_label?.toLowerCase().replace(/\s+/g, '_');
              const answer = resp.data[fieldName] || resp.data[field.field_label] || resp.data[field.id];
              if (answer) {
                formContent += `${field.field_label}: ${typeof answer === 'object' ? JSON.stringify(answer, null, 2) : answer}\n`;
              }
            });
          } else {
            Object.entries(resp.data).forEach(([key, value]) => {
              if (value && !key.startsWith('_') && !['id', 'created_at', 'updated_at', 'submitted_at'].includes(key)) {
                formContent += `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}\n`;
              }
            });
          }
          formContent += '\n';
        });

        formContent += 'CONSOLIDATION GUIDANCE: When responses conflict, prioritize the highest importance score. CEO/decision-maker responses (9-10) should override all others.\n\n';
      } else if (responsesByImportance.length === 1) {
        const singleResponse = responsesByImportance[0];
        if (fields.length > 0) {
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

    if (copyContributions.length > 0) {
      formContent += 'COPY COLLECTION CONTRIBUTIONS (All content must be honored):\n\n';

      copyContributions.forEach((contribution, index) => {
        formContent += `--- COPY CONTRIBUTION ${index + 1} ---\n`;
        formContent += `Contributor: ${contribution.stakeholderName} (${contribution.stakeholderRole})\n`;
        formContent += `IMPORTANCE SCORE: ${contribution.importance}/10 ${contribution.importance >= 8 ? '(HIGH PRIORITY)' : contribution.importance <= 3 ? '(LOW PRIORITY)' : '(MEDIUM PRIORITY)'}\n`;
        formContent += `Submission Mode: ${contribution.mode}\n`;
        if (contribution.fileName) {
          formContent += `Attached File: ${contribution.fileName}\n`;
        }
        if (contribution.copyText) {
          formContent += `COPY PROVIDED:\n${contribution.copyText}\n`;
        } else {
          formContent += 'COPY PROVIDED: [Refer to attached document or form submission]\n';
        }
        formContent += '\n';
      });
    }

    if (responses.length === 0 && copyContributions.length === 0) {
      formContent += 'SAMPLE CONTENT FOR TESTING:\n';
      formContent += '\nBUSINESS NAME: Glid Digital Solutions\n';
      formContent += '\nVALUE PROPOSITION: We help businesses transform their digital presence with modern, user-focused web experiences.\n';
      formContent += '\nTARGET AUDIENCE: Small to medium businesses looking to improve their online presence.\n';
      formContent += '\nKEY SERVICES: Web Design, Development, Digital Strategy\n';
      formContent += '\nBRAND TONE: Professional, approachable, innovative\n\n';
    }

    if (toneDirective) {
      formContent += `TONE OF VOICE GUIDANCE:\n${toneDirective}\n\n`;
    }

    // Get wider project knowledge context for additional grounding
    let projectContext = '';
    if (projectId) {
      try {
        const contextResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/project-knowledge/${projectId}/context`,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          if (contextData.context) {
            projectContext = `\n\nPROJECT CONTEXT:\n${contextData.context}`;
          }
        }
      } catch (error) {
        // Soft fail; project context is optional
      }
    }

    const additionalRequirements = [
      `Aim for ${lengthGuide.targetRange}. ${lengthGuide.reminder}`,
      'Use the EXACT wording, facts, and claims from the client submissions above',
      'Do NOT invent any company details, statistics, or features that were not mentioned',
      'Preserve the client\'s specific language and terminology',
      'If information is missing, use placeholders like "[to be provided]"',
      'Focus on organizing and structuring their actual content, not creating new content'
    ];

    if (toneDirective) {
      additionalRequirements.unshift(`Adopt the client\'s tone of voice: ${toneDirective}`);
    }

    const userPrompt = `Generate structured narrative content for “${pageName || 'Unnamed Page'}” using ONLY the information provided below. Treat copy collection submissions as authoritative content.\n\n${formContent}\nIMPORTANT REQUIREMENTS:\n${additionalRequirements.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}\n\nCreate website-ready content sections that faithfully represent these inputs. Return ONLY a JSON object with section names as keys and narrative content as values. The content should be their words, professionally organized.`;

    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0.7,
      system: SYSTEM_PROMPT + projectContext,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    let narrativeContent;
    try {
      const responseText = completion.content?.[0]?.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        narrativeContent = JSON.parse(jsonMatch[0]);
      } else {
        narrativeContent = { 'Main Content': responseText };
      }
    } catch (parseError) {
      narrativeContent = {
        Introduction: `Welcome to our ${pageName || 'page'}`,
        'Main Content': completion.content?.[0]?.text?.substring(0, 500) || '',
        'Call to Action': 'Get in touch with us to learn more'
      };
    }

    if (!narrativeContent || typeof narrativeContent !== 'object') {
      narrativeContent = {
        Content: 'Generated content based on client submissions'
      };
    }

    return NextResponse.json(narrativeContent);

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate narrative content' }, { status: 500 });
  }
}
