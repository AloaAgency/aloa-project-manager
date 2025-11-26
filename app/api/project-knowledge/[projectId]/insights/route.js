import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-service';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // Validate projectId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || !uuidRegex.test(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    const { question } = await request.json();

    // Input validation and sanitization
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required and must be a string' }, { status: 400 });
    }

    // Limit question length to prevent abuse
    const MAX_QUESTION_LENGTH = 500;
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: `Question must be ${MAX_QUESTION_LENGTH} characters or less` }, { status: 400 });
    }

    // Basic sanitization - remove potential control characters
    const sanitizedQuestion = question.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

    if (!sanitizedQuestion) {
      return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
    }

    // For now, skip auth check to get it working
    // In production, you'd want to properly implement auth
    // But since other endpoints don't check auth, we'll match that pattern

    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get project details first
    const { data: project } = await supabase
      .from('aloa_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Get all project knowledge
    let { data: knowledge, error: knowledgeError } = await supabase
      .from('aloa_project_knowledge')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .order('importance_score', { ascending: false });

    if (knowledgeError) {
      // If table doesn't exist or other error, use empty knowledge
      knowledge = [];
    }

    // Get project stakeholders
    const { data: stakeholders } = await supabase
      .from('aloa_project_stakeholders')
      .select('*')
      .eq('project_id', projectId);

    // Get project members
    const { data: members } = await supabase
      .from('aloa_project_members')
      .select(`
        *,
        user:aloa_user_profiles(
          email,
          full_name,
          role
        )
      `)
      .eq('project_id', projectId);

    // Get writing style for this project
    const { data: writingStyle } = await supabase
      .from('aloa_project_writing_style')
      .select('style_summary, style_attributes, tone_keywords, voice_perspective, formality_level, do_not_use, always_use, admin_notes')
      .eq('project_id', projectId)
      .maybeSingle();

    // Build project metadata as additional context
    const projectMetadata = [];

    if (project) {
      // Handle both old and new column names
      const projectName = project.name || project.project_name;
      const clientName = project.client_name;
      const projectDescription = project.description || project.metadata?.description;
      const liveUrl = project.live_url || project.metadata?.live_url;
      const stagingUrl = project.staging_url || project.metadata?.staging_url;
      const projectType = project.project_type || project.metadata?.project_type;

      if (projectName) {
        projectMetadata.push(`Project Name: ${projectName}`);
      }
      if (clientName) {
        projectMetadata.push(`Client: ${clientName}`);
      }
      if (projectDescription) {
        projectMetadata.push(`Project Description: ${projectDescription}`);
      }
      if (projectType) {
        projectMetadata.push(`Project Type: ${projectType}`);
      }
      if (liveUrl) {
        projectMetadata.push(`Current Website: ${liveUrl}`);
      }
      if (stagingUrl) {
        projectMetadata.push(`Staging Site: ${stagingUrl}`);
      }
      if (project.start_date) {
        projectMetadata.push(`Project Start Date: ${new Date(project.start_date).toLocaleDateString()}`);
      }
      if (project.target_launch_date || project.target_completion_date) {
        const targetDate = project.target_launch_date || project.target_completion_date;
        projectMetadata.push(`Target Launch Date: ${new Date(targetDate).toLocaleDateString()}`);
      }
      if (project.budget) {
        projectMetadata.push(`Budget: $${project.budget}`);
      }
      if (project.status) {
        projectMetadata.push(`Status: ${project.status}`);
      }
      // Add project ID for reference
      projectMetadata.push(`Project ID: ${project.id}`);
    }

    if (stakeholders && stakeholders.length > 0) {
      const stakeholderList = stakeholders.map(s => `${s.name} (${s.role})`).join(', ');
      projectMetadata.push(`Stakeholders: ${stakeholderList}`);
    }

    if (members && members.length > 0) {
      const clientMembers = members.filter(m => m.user?.role === 'client' || m.user?.role === 'client_admin' || m.user?.role === 'client_participant');
      const teamMembers = members.filter(m => m.user?.role === 'team_member' || m.user?.role === 'project_admin');

      if (clientMembers.length > 0) {
        const clientList = clientMembers.map(m => m.user?.full_name || m.user?.email).join(', ');
        projectMetadata.push(`Client Team: ${clientList}`);
      }

      if (teamMembers.length > 0) {
        const teamList = teamMembers.map(m => m.user?.full_name || m.user?.email).join(', ');
        projectMetadata.push(`Aloa Team: ${teamList}`);
      }
    }

    // Handle case where no extracted knowledge exists yet (but we still have project metadata)
    if ((!knowledge || knowledge.length === 0) && projectMetadata.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough project data yet to provide insights. As the team collects more information through forms, applets, and file uploads, I'll be able to analyze the project and answer your questions.",
        sources: [],
        knowledgeCount: 0
      });
    }

    // Build context from knowledge
    const knowledgeByCategory = {};
    knowledge.forEach(item => {
      if (!knowledgeByCategory[item.category]) {
        knowledgeByCategory[item.category] = [];
      }
      knowledgeByCategory[item.category].push(item);
    });

    let contextSections = [];

    // Brand Identity
    if (knowledgeByCategory.brand_identity) {
      contextSections.push(`BRAND IDENTITY:\n${
        knowledgeByCategory.brand_identity
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Design Preferences
    if (knowledgeByCategory.design_preferences) {
      contextSections.push(`DESIGN PREFERENCES:\n${
        knowledgeByCategory.design_preferences
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Content Strategy
    if (knowledgeByCategory.content_strategy) {
      contextSections.push(`CONTENT STRATEGY:\n${
        knowledgeByCategory.content_strategy
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Functionality
    if (knowledgeByCategory.functionality) {
      contextSections.push(`FUNCTIONALITY REQUIREMENTS:\n${
        knowledgeByCategory.functionality
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Target Audience
    if (knowledgeByCategory.target_audience) {
      contextSections.push(`TARGET AUDIENCE:\n${
        knowledgeByCategory.target_audience
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Business Goals
    if (knowledgeByCategory.business_goals) {
      contextSections.push(`BUSINESS GOALS:\n${
        knowledgeByCategory.business_goals
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    // Feedback
    if (knowledgeByCategory.feedback) {
      contextSections.push(`CLIENT FEEDBACK:\n${
        knowledgeByCategory.feedback
          .map(k => `- ${k.content_summary}`)
          .join('\n')
      }`);
    }

    const projectContext = contextSections.join('\n\n');

    // Get detailed data for specific questions
    const detailedData = {};
    for (const item of knowledge.slice(0, 10)) {
      if (item.content) {
        try {
          const content = JSON.parse(item.content);
          detailedData[item.source_name] = content;
        } catch {
          detailedData[item.source_name] = item.content;
        }
      }
    }

    const systemPrompt = `You are an AI assistant analyzing a web design project for Aloa Agency. You have access to all collected project knowledge including client preferences, requirements, and feedback.

Your role is to provide insightful analysis to help the agency team understand:
- Client preferences and requirements
- Potential areas of concern or conflict
- Opportunities for additional data collection
- Patterns in client feedback
- Strategic recommendations

${projectMetadata.length > 0 ? `PROJECT INFORMATION:
${projectMetadata.join('\n')}` : 'No project information available.'}

${contextSections.length > 0 ? `PROJECT KNOWLEDGE:
${projectContext}` : 'PROJECT KNOWLEDGE:\nNo client interactions collected yet.'}

${Object.keys(detailedData).length > 0 ? `DETAILED DATA:
${JSON.stringify(detailedData, null, 2)}` : ''}

${writingStyle ? `WRITING STYLE GUIDE:
When generating ANY written content for this project, you MUST adhere to this style:
${writingStyle.style_summary ? `Style Overview: ${writingStyle.style_summary}` : ''}
${writingStyle.formality_level ? `Formality: ${writingStyle.formality_level.replace(/_/g, ' ')}` : ''}
${writingStyle.voice_perspective ? `Voice: ${writingStyle.voice_perspective.replace(/_/g, ' ')}` : ''}
${writingStyle.tone_keywords?.length > 0 ? `Tone: ${writingStyle.tone_keywords.join(', ')}` : ''}
${writingStyle.always_use?.length > 0 ? `Preferred Phrases: ${writingStyle.always_use.join(', ')}` : ''}
${writingStyle.do_not_use?.length > 0 ? `Avoid These: ${writingStyle.do_not_use.join(', ')}` : ''}
${writingStyle.admin_notes ? `Additional Notes: ${writingStyle.admin_notes}` : ''}
` : ''}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
1. ALWAYS START by acknowledging the project context: mention the project name, client name, and any other known details
2. NEVER give generic answers - ALWAYS ground your response in the specific project data provided above
3. When answering ANY question, first state what you know about the project (even basic facts like name, URLs, dates)
4. Reference SPECIFIC data points from the PROJECT INFORMATION and PROJECT KNOWLEDGE sections
5. If project metadata exists (name, client, URLs, dates), you MUST reference it in your answer
6. Be specific - use actual names, URLs, dates, and details from the data provided
7. If data is limited, still reference what IS known before discussing gaps
8. Identify patterns and connections between different data points
9. Suggest actionable next steps based on the specific project context
10. NEVER say you don't have information without first stating what you DO know about the project

EXAMPLE: Instead of "I don't have tone of voice data", say "For the [Project Name] project for [Client Name], which has [live URL] as their current site, I don't yet have tone of voice preferences..."

Remember: You are analyzing a SPECIFIC project with SPECIFIC details. Always demonstrate awareness of those details.`;

    // Generate AI response
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: sanitizedQuestion
        }
      ]
    });

    const answer = completion.content[0].text;

    // Identify sources used
    const sources = [];
    knowledge.slice(0, 5).forEach(item => {
      // Check if category exists and matches
      const categoryMatch = item.category &&
        answer.toLowerCase().includes(item.category.replace('_', ' '));

      // Check if any tags match
      const tagMatch = item.tags &&
        item.tags.some(tag => answer.toLowerCase().includes(tag));

      if (categoryMatch || tagMatch) {
        sources.push(item.source_name);
      }
    });

    return NextResponse.json({
      answer,
      sources: [...new Set(sources)].slice(0, 3),
      knowledgeCount: knowledge.length
    });

  } catch (error) {

    // Check if it's an Anthropic API error
    if (error.message?.includes('API key') || error.status === 401) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please check API keys.', details: error.message },
        { status: 500 }
      );
    }

    // Check if it's a database error
    if (error.code === '42703') {
      return NextResponse.json(
        { error: 'Database schema issue. Please run the fix_knowledge_importance_column.sql script in Supabase.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate insights', details: error.message },
      { status: 500 }
    );
  }
}
