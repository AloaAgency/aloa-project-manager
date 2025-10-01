import { createClient } from '@supabase/supabase-js';

// Create a service role client for knowledge extraction
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export class KnowledgeExtractor {
  constructor(projectId) {
    this.projectId = projectId;
  }

  // Extract knowledge from project creation or updates
  async extractFromProject(project) {
    try {
      let projectData = project;

      if (!projectData) {
        const { data: fetchedProject, error: projectError } = await supabase
          .from('aloa_projects')
          .select('*')
          .eq('id', this.projectId)
          .single();

        if (projectError || !fetchedProject) {
          throw new Error('Project not found');
        }

        projectData = fetchedProject;
      }

      const knowledgeItems = [];

      if (projectData.project_name || projectData.name) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: this.projectId,
          source_name: 'Project Information',
          content_type: 'structured_data',
          content: JSON.stringify({
            name: projectData.name || projectData.project_name,
            client: projectData.client_name,
            client_email: projectData.client_email,
            status: projectData.status,
            budget: projectData.budget
          }),
          content_summary: `Project: ${projectData.name || projectData.project_name} for ${projectData.client_name}`,
          category: 'project_info',
          tags: ['project', 'client', 'overview'],
          importance_score: 10,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (projectData.start_date || projectData.target_completion_date) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_timeline`,
          source_name: 'Project Timeline',
          content_type: 'structured_data',
          content: JSON.stringify({
            start_date: projectData.start_date,
            target_completion: projectData.target_completion_date || projectData.target_launch_date,
            actual_completion: projectData.actual_completion_date
          }),
          content_summary: `Project timeline: ${projectData.start_date} to ${projectData.target_completion_date || projectData.target_launch_date || 'TBD'}`,
          category: 'project_info',
          tags: ['timeline', 'deadlines', 'schedule'],
          importance_score: 8,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (projectData.live_url || projectData.staging_url) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_urls`,
          source_name: 'Project URLs',
          content_type: 'structured_data',
          content: JSON.stringify({
            live_url: projectData.live_url,
            staging_url: projectData.staging_url
          }),
          content_summary: `URLs - Live: ${projectData.live_url || 'None'}, Staging: ${projectData.staging_url || 'None'}`,
          category: 'technical_specs',
          tags: ['urls', 'website', 'staging'],
          importance_score: 7,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (projectData.description) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_description`,
          source_name: 'Project Description',
          content_type: 'text',
          content: projectData.description,
          content_summary: projectData.description.substring(0, 200),
          category: 'project_info',
          tags: ['description', 'overview', 'scope'],
          importance_score: 9,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (projectData.metadata && typeof projectData.metadata === 'object') {
        const metadata = projectData.metadata;

        if (metadata.scope) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'project_metadata',
            source_id: `${this.projectId}_scope`,
            source_name: 'Project Scope',
            content_type: 'structured_data',
            content: JSON.stringify(metadata.scope),
            content_summary: `Scope: ${metadata.scope.description || ''} - ${metadata.scope.main_pages || 0} main pages, ${metadata.scope.aux_pages || 0} aux pages`,
            category: 'functionality',
            tags: ['scope', 'pages', 'deliverables'],
            importance_score: 9,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }

        if (metadata.project_type) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'project_metadata',
            source_id: `${this.projectId}_type`,
            source_name: 'Project Type',
            content_type: 'text',
            content: metadata.project_type,
            content_summary: `Project Type: ${metadata.project_type}`,
            category: 'project_info',
            tags: ['type', 'category'],
            importance_score: 7,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (knowledgeItems.length > 0) {
        await supabase
          .from('aloa_project_knowledge')
          .update({ is_current: false })
          .eq('project_id', this.projectId)
          .eq('source_type', 'project_metadata');

        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          // Error inserting project knowledge
        }
      }

      return knowledgeItems;
    } catch (error) {
      throw error;
    }
  }

  async extractFromFormResponse(responseId) {
    try {
      const { data: response, error } = await supabase
        .from('aloa_form_responses')
        .select(`
          *,
          form:aloa_forms(
            id,
            title,
            description,
            aloa_form_fields(
              field_label,
              field_name,
              field_type
            )
          ),
          answers:aloa_form_response_answers(
            field_name,
            field_value
          )
        `)
        .eq('id', responseId)
        .single();

      if (error || !response) {
        throw new Error('Response not found');
      }

      const formData = {
        ...(response.responses || {})
      };

      if (Array.isArray(response.answers)) {
        for (const answer of response.answers) {
          if (!answer?.field_name) continue;

          let parsedValue = answer.field_value;
          try {
            parsedValue = JSON.parse(answer.field_value);
          } catch {
            // Value is plain text
          }

          formData[answer.field_name] = parsedValue;
        }
      }

      const formTitle = response.form?.title || 'Form Response';
      const knowledgeItems = [];

      for (const [fieldName, value] of Object.entries(formData)) {
        if (value === undefined || value === null || value === '') continue;

        const field = response.form?.aloa_form_fields?.find(f => f.field_name === fieldName);
        const fieldLabel = field?.field_label || fieldName;

        const category = this.categorizeContent(fieldLabel, value);
        const importance = this.calculateImportance(fieldLabel, field?.field_type);

        const content = typeof value === 'object' ? JSON.stringify(value) : String(value);

        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'form_response',
          source_id: responseId,
          source_name: `${formTitle} - ${fieldLabel}`,
          content_type: field?.field_type === 'file' ? 'structured_data' : 'text',
          content,
          content_summary: this.generateSummary(fieldLabel, content),
          category,
          tags: this.extractTags(fieldLabel, content),
          importance_score: importance,
          extracted_by: 'system',
          extraction_confidence: 0.95,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (knowledgeItems.length > 0) {
        await supabase
          .from('aloa_project_knowledge')
          .update({ is_current: false })
          .eq('project_id', this.projectId)
          .eq('source_type', 'form_response')
          .eq('source_id', responseId);

        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          // Error inserting knowledge items
        }
      }

      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('source_id', responseId)
        .eq('source_type', 'form_response');

      return knowledgeItems;
    } catch (error) {
      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          attempts: 1
        })
        .eq('source_id', responseId)
        .eq('source_type', 'form_response');

      throw error;
    }
  }

  async extractFromAppletInteraction(interactionId) {
    try {
      const { data: interaction, error } = await supabase
        .from('aloa_applet_interactions')
        .select(`
          *,
          applet:aloa_applets(
            name,
            type,
            config
          )
        `)
        .eq('id', interactionId)
        .single();

      if (error || !interaction) {
        throw new Error('Interaction not found');
      }

      const knowledgeItems = [];
      const appletName = interaction.applet?.name || 'Applet';
      const interactionData = interaction.data || {};

      if (interaction.applet?.type === 'palette_cleanser') {
        const selectedColors = interactionData.selectedPalettes || [];

        if (selectedColors.length > 0) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - Color Preferences`,
            content_type: 'preferences',
            content: JSON.stringify(selectedColors),
            content_summary: `Client selected ${selectedColors.length} color palette(s): ${selectedColors.map(p => p.name).join(', ')}`,
            category: 'design_preferences',
            tags: ['colors', 'palette', 'visual_design'],
            importance_score: 8,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (interaction.applet?.type === 'tone_of_voice') {
        // Check for data in form_progress (where ToneOfVoiceSelector saves it)
        const formProgress = interactionData.form_progress || {};
        const selectedTone = formProgress.selectedTone;
        const educationLevel = formProgress.educationLevel;
        const toneName = formProgress.toneName;
        const educationLevelName = formProgress.educationLevelName;

        if (selectedTone) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - Tone of Voice`,
            content_type: 'preferences',
            content: JSON.stringify({
              tone: selectedTone,
              toneName: toneName,
              educationLevel: educationLevel,
              educationLevelName: educationLevelName
            }),
            content_summary: `Client selected brand voice: ${toneName || selectedTone}${educationLevelName ? ` at ${educationLevelName} level` : ''}`,
            category: 'content_strategy',
            tags: ['tone', 'voice', 'brand_personality', 'content', selectedTone.toLowerCase(), educationLevel].filter(Boolean),
            importance_score: 8,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (interaction.applet?.type === 'font_picker') {
        // Check for data in form_progress (where FontPicker saves it)
        const formProgress = interactionData.form_progress || {};
        const fontStatus = formProgress.fontStatus;
        const fontStatusLabel = formProgress.fontStatusLabel;
        const customFonts = formProgress.customFonts;
        const selectedPairings = formProgress.selectedPairings || [];
        const selectedPairingDetails = formProgress.selectedPairingDetails || [];

        if (fontStatus) {
          let contentSummary = '';
          let knowledgeContent = {
            fontStatus: fontStatus,
            fontStatusLabel: fontStatusLabel
          };

          if (fontStatus === 'have_fonts_flexible') {
            // Client has fonts but is flexible
            knowledgeContent.customFonts = customFonts;
            contentSummary = `Client has fonts (${customFonts}) but open to better alternatives`;
          } else if (fontStatus === 'have_fonts_strict') {
            // Client must use specific fonts (brand guidelines)
            knowledgeContent.customFonts = customFonts;
            contentSummary = `Client MUST use these fonts (brand requirement): ${customFonts}`;
          } else if (fontStatus === 'blank_slate') {
            // Client selected typography mood pairings
            knowledgeContent.selectedPairings = selectedPairings;
            knowledgeContent.selectedPairingDetails = selectedPairingDetails;
            const moodNames = selectedPairingDetails.map(p => p.mood).join(', ');
            const emotions = selectedPairingDetails.map(p => p.emotion).join(' | ');
            contentSummary = `Client drawn to these typography moods: ${moodNames}. Emotions: ${emotions}`;
          }

          // Extract mood/emotion tags from pairings
          const moodTags = selectedPairingDetails.flatMap(p => p.vibe?.map(v => v.toLowerCase()) || []);

          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - Typography Preferences`,
            content_type: 'preferences',
            content: JSON.stringify(knowledgeContent),
            content_summary: contentSummary,
            category: 'design_preferences',
            tags: ['typography', 'fonts', 'design', 'brand_identity', fontStatus, ...moodTags].filter(Boolean),
            importance_score: 7,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (interaction.applet?.type === 'sitemap_builder') {
        const sitemapData = interactionData.sitemap || {};

        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'applet_interaction',
          source_id: interactionId,
          source_name: `${appletName} - Site Structure`,
          content_type: 'structured_data',
          content: JSON.stringify(sitemapData),
          content_summary: `Site structure with ${Object.keys(sitemapData).length} sections defined`,
          category: 'functionality',
          tags: ['sitemap', 'navigation', 'information_architecture'],
          importance_score: 9,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      if (interaction.applet?.type === 'link_submission') {
        const links = interactionData.links || [];

        for (const link of links) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - ${link.type || 'Reference'}`,
            content_type: 'structured_data',
            content: JSON.stringify(link),
            content_summary: `${link.type || 'Reference'} link: ${link.url}`,
            category: link.type === 'current_site' ? 'business_goals' : 'inspiration',
            tags: ['reference', 'links', link.type],
            importance_score: link.type === 'current_site' ? 9 : 6,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });

          if (link.type === 'current_site') {
            await this.queueWebsiteExtraction(link.url);
          }
        }
      }

      if (interaction.applet?.type === 'copy_collection') {
        const formProgress = interactionData.form_progress || {};
        const mode = formProgress.mode || (formProgress.formCompleted ? 'form' : 'unknown');
        const uploadedContent = typeof formProgress.uploadedContent === 'string'
          ? formProgress.uploadedContent.trim()
          : '';

        if (uploadedContent || formProgress.formCompleted || formProgress.fileId || formProgress.fileUrl) {
          const knowledgePayload = {
            mode,
            copy_text: uploadedContent || null,
            file_name: formProgress.uploadedFileName || null,
            file_id: formProgress.fileId || null,
            file_url: formProgress.fileUrl || null,
            form_id: formProgress.formId || null,
            form_completed: Boolean(formProgress.formCompleted)
          };

          const summaryParts = [`Mode: ${mode}`];

          if (uploadedContent) {
            const preview = uploadedContent.length > 160
              ? `${uploadedContent.substring(0, 157)}...`
              : uploadedContent;
            summaryParts.push(`Copy Preview: "${preview}"`);
          }

          if (formProgress.uploadedFileName) {
            summaryParts.push(`Attached File: ${formProgress.uploadedFileName}`);
          }

          if (formProgress.formCompleted && formProgress.formId) {
            summaryParts.push(`Form Submission: ${formProgress.formId}`);
          }

          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - Page Copy`,
            content_type: 'structured_data',
            content: JSON.stringify(knowledgePayload),
            content_summary: summaryParts.join(' | '),
            category: 'content_strategy',
            tags: ['copy', 'content', 'page_copy', mode].filter(Boolean),
            importance_score: 9,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true,
            metadata: {
              user_id: formProgress.userId || null,
              stakeholder_importance: formProgress.stakeholderImportance || null
            }
          });
        }
      }

      if (interaction.applet?.type === 'phase_review') {
        const reviewData = interactionData.form_progress?.reviewData || interactionData.reviewData || {};
        const decision = reviewData.decision || 'pending';
        const feedback = reviewData.feedback || '';
        const checkedItems = reviewData.checkedItems || {};
        const reviewItems = interaction.applet?.config?.review_items || [];

        if (reviewData.timestamp || decision !== 'pending' || Object.keys(checkedItems).length > 0) {
          const checklistSummary = reviewItems.length > 0
            ? reviewItems.map((item, index) => {
                const label = item?.title || `Checklist Item ${index + 1}`;
                const status = checkedItems[index] ? '✔' : '✖';
                return `${status} ${label}`;
              }).join(' | ')
            : Object.entries(checkedItems).map(([index, status]) => `Item ${index}: ${status ? 'Completed' : 'Needs attention'}`).join(' | ');

          const summaryParts = [
            `Decision: ${decision === 'approve' ? 'Approved' : decision === 'revise' ? 'Revision Requested' : 'Pending'}`
          ];

          if (feedback) {
            const trimmedFeedback = feedback.length > 200 ? `${feedback.substring(0, 197)}...` : feedback;
            summaryParts.push(`Feedback: "${trimmedFeedback}"`);
          }

          if (checklistSummary) {
            summaryParts.push(`Checklist: ${checklistSummary}`);
          }

          const knowledgePayload = {
            decision,
            feedback,
            checkedItems,
            checklist: reviewItems,
            submitted_at: reviewData.timestamp || new Date().toISOString(),
            user_id: reviewData.userId || interactionData.form_progress?.userId || null
          };

          await supabase
            .from('aloa_project_knowledge')
            .update({ is_current: false })
            .eq('project_id', this.projectId)
            .eq('source_type', 'applet_interaction')
            .eq('source_id', interactionId)
            .eq('source_name', `${appletName} - Phase Review`);

          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - Phase Review`,
            content_type: 'structured_data',
            content: JSON.stringify(knowledgePayload),
            content_summary: summaryParts.join(' | '),
            category: 'feedback',
            tags: ['phase_review', 'approval', decision].filter(Boolean),
            importance_score: decision === 'approve' ? 9 : 8,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true,
            metadata: {
              user_id: reviewData.userId || interactionData.form_progress?.userId || null,
              stakeholder_importance: interaction.stakeholder_importance || null
            }
          });
        }
      }

      if (interaction.applet?.type === 'ai_narrative_generator') {
        const narrativeContent = interactionData.narrativeContent || interaction.applet?.config?.generatedContent || {};
        const pageName = interaction.applet?.config?.pageName || 'Page';

        if (Object.keys(narrativeContent).length > 0) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - ${pageName} Narrative`,
            content_type: 'structured_data',
            content: JSON.stringify(narrativeContent),
            content_summary: `AI-generated narrative content for ${pageName} with ${Object.keys(narrativeContent).length} sections`,
            category: 'content_strategy',
            tags: ['narrative', 'content', 'copywriting', pageName.toLowerCase(), 'ai_generated'],
            importance_score: 9,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (interaction.applet?.type === 'phase_review') {
        const reviewData = interactionData.form_progress?.reviewData || {};
        const decision = reviewData.decision; // 'approve' or 'revise'
        const feedback = reviewData.feedback || '';
        const checkedItems = reviewData.checkedItems || {};
        const hasSubmitted = reviewData.hasSubmitted || false;
        const timestamp = reviewData.timestamp;

        // Get config details for context
        const appletConfig = interaction.applet?.config || {};
        const remainingRevisions = appletConfig.remaining_revisions;
        const maxRevisions = appletConfig.max_revisions;
        const phaseName = appletConfig.heading || 'Phase Review';

        if (hasSubmitted && decision) {
          // Extract the main review decision and feedback
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'applet_interaction',
            source_id: interactionId,
            source_name: `${appletName} - ${phaseName} Decision`,
            content_type: 'structured_data',
            content: JSON.stringify({
              decision: decision,
              feedback: feedback,
              checklist_items: checkedItems,
              remaining_revisions: remainingRevisions,
              max_revisions: maxRevisions,
              timestamp: timestamp
            }),
            content_summary: `Phase Review ${decision === 'approve' ? 'APPROVED' : 'REVISION REQUESTED'}: ${feedback ? feedback.substring(0, 150) : 'No additional feedback provided'}`,
            category: 'feedback',
            tags: ['phase_review', 'milestone', decision, `revisions_${remainingRevisions}`],
            importance_score: 10, // Phase reviews are critical milestones
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });

          // If revision was requested, extract specific feedback as separate item for clarity
          if (decision === 'revise' && feedback) {
            knowledgeItems.push({
              project_id: this.projectId,
              source_type: 'applet_interaction',
              source_id: `${interactionId}_feedback`,
              source_name: `${appletName} - Revision Feedback`,
              content_type: 'text',
              content: feedback,
              content_summary: `Client requested revisions: ${feedback.substring(0, 200)}`,
              category: 'feedback',
              tags: ['revision_request', 'client_feedback', 'phase_review', 'action_required'],
              importance_score: 9,
              extracted_by: 'system',
              extraction_confidence: 1.0,
              processed_at: new Date().toISOString(),
              is_current: true
            });
          }
        }
      }

      if (knowledgeItems.length > 0) {
        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          // Error inserting knowledge items
        }
      }

      return knowledgeItems;
    } catch (error) {
      // Error extracting from applet interaction
      throw error;
    }
  }

  async extractFromFile(fileId) {
    try {

      const { data: file, error } = await supabase
        .from('aloa_project_files')
        .select('*')
        .eq('id', fileId)
        .single();


      if (error || !file) {
        // File not found in database
        throw new Error('File not found');
      }


      let content = '';
      let summary = '';
      const fileUrl = file.url || file.storage_path;

      // Check file type - handle both mime types and extensions
      const isTextFile = file.file_type?.includes('text') ||
                        file.file_name?.endsWith('.md') ||
                        file.file_name?.endsWith('.txt');
      const isJsonFile = file.file_type === 'application/json' || file.file_name?.endsWith('.json');
      const isCsvFile = file.file_type === 'text/csv' || file.file_name?.endsWith('.csv');
      const isPdfFile = file.file_type === 'application/pdf' || file.file_name?.endsWith('.pdf');
      const isWordFile = file.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.file_name?.endsWith('.docx');
      const isExcelFile = file.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                          file.file_name?.endsWith('.xlsx');

      // Fetch file content based on type
      if (fileUrl) {
        try {
          let fileBuffer;

          // Get the file as buffer for binary files
          if (isPdfFile || isWordFile || isExcelFile) {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error('Failed to fetch file content');
            }
            fileBuffer = await response.arrayBuffer();
          }

          // Process PDF files
          if (isPdfFile && fileBuffer) {
            try {
              const pdfParse = (await import('pdf-parse')).default;
              const pdfData = await pdfParse(Buffer.from(fileBuffer));
              content = pdfData.text;
              const pageCount = pdfData.numpages;
              const wordCount = content.split(/\s+/).length;
              summary = `PDF document with ${pageCount} pages, ~${wordCount} words. Preview: ${content.substring(0, 400)}`;
            } catch (pdfError) {
              console.error('Error parsing PDF:', pdfError);
              summary = `PDF document: ${file.file_name} (extraction failed)`;
              content = summary;
            }
          }

          // Process Word documents
          else if (isWordFile && fileBuffer) {
            try {
              const mammoth = (await import('mammoth')).default;
              const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
              content = result.value;
              const wordCount = content.split(/\s+/).length;
              summary = `Word document with ~${wordCount} words. Preview: ${content.substring(0, 400)}`;
            } catch (docError) {
              console.error('Error parsing Word document:', docError);
              summary = `Word document: ${file.file_name} (extraction failed)`;
              content = summary;
            }
          }

          // Process Excel files
          else if (isExcelFile && fileBuffer) {
            try {
              const XLSX = (await import('xlsx')).default;
              const workbook = XLSX.read(fileBuffer, { type: 'array' });

              // Extract data from all sheets
              const allContent = [];
              const sheetNames = workbook.SheetNames;

              for (const sheetName of sheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (jsonData.length > 0) {
                  allContent.push(`Sheet: ${sheetName}`);

                  // Get headers if available
                  const headers = jsonData[0];
                  if (headers && Array.isArray(headers)) {
                    allContent.push(`Headers: ${headers.join(', ')}`);
                  }

                  // Store the data as structured JSON
                  allContent.push(JSON.stringify(jsonData.slice(0, 10), null, 2));
                }
              }

              content = allContent.join('\n\n');
              const rowCount = sheetNames.reduce((total, sheetName) => {
                const sheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
                return total + (range.e.r - range.s.r + 1);
              }, 0);

              summary = `Excel spreadsheet with ${sheetNames.length} sheet(s), ~${rowCount} total rows. Sheets: ${sheetNames.join(', ')}`;
            } catch (xlsxError) {
              console.error('Error parsing Excel file:', xlsxError);
              summary = `Excel file: ${file.file_name} (extraction failed)`;
              content = summary;
            }
          }

          // Handle text-based files (existing code)
          else if (isTextFile || isJsonFile || isCsvFile) {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error('Failed to fetch file content');
            }
            content = await response.text();
            summary = content.substring(0, 500);
          }

        } catch (fetchError) {
          console.error('Error fetching file:', fetchError);
          // Try to get content from storage directly
          if (file.storage_path) {
            const { data, error: downloadError } = await supabase.storage
              .from('project-files')
              .download(file.storage_path);

            if (!downloadError && data) {
              // Process based on file type
              if (isPdfFile || isWordFile || isExcelFile) {
                const fileBuffer = await data.arrayBuffer();

                if (isPdfFile) {
                  try {
                    const pdfParse = (await import('pdf-parse')).default;
                    const pdfData = await pdfParse(Buffer.from(fileBuffer));
                    content = pdfData.text;
                    summary = `PDF document with ${pdfData.numpages} pages`;
                  } catch (e) {
                    content = `PDF: ${file.file_name}`;
                    summary = content;
                  }
                } else if (isWordFile) {
                  try {
                    const mammoth = (await import('mammoth')).default;
                    const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
                    content = result.value;
                    summary = content.substring(0, 500);
                  } catch (e) {
                    content = `Word document: ${file.file_name}`;
                    summary = content;
                  }
                } else if (isExcelFile) {
                  try {
                    const XLSX = (await import('xlsx')).default;
                    const workbook = XLSX.read(fileBuffer, { type: 'array' });
                    const sheetNames = workbook.SheetNames;
                    const allContent = [];

                    for (const sheetName of sheetNames) {
                      const sheet = workbook.Sheets[sheetName];
                      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                      allContent.push(`${sheetName}: ${JSON.stringify(jsonData.slice(0, 5))}`);
                    }

                    content = allContent.join('\n');
                    summary = `Excel with ${sheetNames.length} sheets`;
                  } catch (e) {
                    content = `Excel: ${file.file_name}`;
                    summary = content;
                  }
                }
              } else {
                content = await data.text();
                summary = content.substring(0, 500);
              }
            }
          }
        }
      }

      if (isJsonFile && content) {
        try {
          const jsonData = JSON.parse(content);
          content = JSON.stringify(jsonData, null, 2);
          summary = 'JSON document containing structured data';
        } catch (jsonError) {
          // Error parsing JSON
          summary = content.substring(0, 500);
        }
      }

      if (isCsvFile && content) {
        // For CSV, just store raw content and create appropriate summary
        const lines = content.split('\n');
        const headers = lines[0];
        const rowCount = lines.length - 1;
        summary = `CSV data with ${rowCount} rows. Headers: ${headers.substring(0, 200)}`;
      }

      if (!content) {
        // If still no content, just store metadata
        summary = `Document: ${file.file_name} (${file.file_type})`;
        content = summary;
      }

      // Only create knowledge item if we have content
      if (!content) {
        // No content extracted from file
        return null;
      }

      const knowledgeItem = {
        project_id: this.projectId,
        source_type: 'file_document',
        source_id: fileId,
        source_name: file.file_name,
        source_url: file.url || file.storage_path,
        content_type: 'text',
        content: content,
        content_summary: summary,
        category: this.categorizeFile ? this.categorizeFile(file.file_name, content) : 'documentation',
        tags: this.extractTags ? this.extractTags(file.file_name, content) : ['file', 'document'],
        importance_score: 6,
        extracted_by: 'system',
        extraction_confidence: 0.85,
        processed_at: new Date().toISOString(),
        is_current: true
      };

      const { error: insertError } = await supabase
        .from('aloa_project_knowledge')
        .insert(knowledgeItem);

      if (insertError) {
        // Error inserting knowledge
      }

      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('source_id', fileId)
        .eq('source_type', 'file_document');

      return knowledgeItem;
    } catch (error) {
      // Error extracting from file

      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          attempts: 1
        })
        .eq('source_id', fileId)
        .eq('source_type', 'file_document');

      throw error;
    }
  }

  async queueWebsiteExtraction(url) {
    const { error } = await supabase
      .from('aloa_knowledge_extraction_queue')
      .insert({
        project_id: this.projectId,
        source_type: 'website_content',
        source_id: url,
        source_url: url,
        priority: 9,
        status: 'pending'
      })
      .onConflict('project_id,source_type,source_id')
      .ignore();

    if (error) {
      // Error queuing website extraction
    }
  }

  categorizeFile(fileName, content) {
    const nameLower = fileName.toLowerCase();
    const contentLower = content.toLowerCase();

    if (nameLower.includes('readme') || nameLower.includes('doc')) {
      return 'documentation';
    }
    if (nameLower.includes('spec') || nameLower.includes('requirement')) {
      return 'requirements';
    }
    if (nameLower.includes('design') || contentLower.includes('design')) {
      return 'design_preferences';
    }
    if (nameLower.includes('brand') || contentLower.includes('brand')) {
      return 'brand_identity';
    }
    return 'documentation';
  }

  extractTags(fileName, content) {
    const tags = ['file', 'document'];
    const nameLower = fileName.toLowerCase();

    if (nameLower.endsWith('.md')) tags.push('markdown');
    if (nameLower.endsWith('.txt')) tags.push('text');
    if (nameLower.endsWith('.json')) tags.push('json');
    if (nameLower.includes('readme')) tags.push('readme');
    if (nameLower.includes('spec')) tags.push('specification');

    return tags;
  }

  categorizeContent(label, value) {
    const labelLower = label.toLowerCase();
    const valueLower = String(value).toLowerCase();

    if (labelLower.includes('brand') || labelLower.includes('logo') || labelLower.includes('identity')) {
      return 'brand_identity';
    }
    if (labelLower.includes('design') || labelLower.includes('style') || labelLower.includes('ui') || labelLower.includes('ux')) {
      return 'design_preferences';
    }
    if (labelLower.includes('content') || labelLower.includes('tone') || labelLower.includes('voice') || labelLower.includes('message')) {
      return 'content_strategy';
    }
    if (labelLower.includes('feature') || labelLower.includes('function') || labelLower.includes('requirement')) {
      return 'functionality';
    }
    if (labelLower.includes('audience') || labelLower.includes('user') || labelLower.includes('customer') || labelLower.includes('demographic')) {
      return 'target_audience';
    }
    if (labelLower.includes('goal') || labelLower.includes('objective') || labelLower.includes('kpi') || labelLower.includes('metric')) {
      return 'business_goals';
    }
    if (labelLower.includes('technical') || labelLower.includes('tech') || labelLower.includes('platform') || labelLower.includes('integration')) {
      return 'technical_specs';
    }
    if (labelLower.includes('feedback') || labelLower.includes('revision') || labelLower.includes('comment')) {
      return 'feedback';
    }
    if (labelLower.includes('inspiration') || labelLower.includes('reference') || labelLower.includes('example')) {
      return 'inspiration';
    }

    return null;
  }

  categorizeFile(fileName, content) {
    const nameLower = fileName.toLowerCase();
    const contentLower = content.toLowerCase();

    if (nameLower.includes('brand') || contentLower.includes('brand guide')) {
      return 'brand_identity';
    }
    if (nameLower.includes('requirement') || nameLower.includes('spec')) {
      return 'functionality';
    }
    if (nameLower.includes('content') || nameLower.includes('copy')) {
      return 'content_strategy';
    }
    if (nameLower.includes('design') || nameLower.includes('wireframe') || nameLower.includes('mockup')) {
      return 'design_preferences';
    }

    return null;
  }

  calculateImportance(label, fieldType) {
    const labelLower = label.toLowerCase();

    if (labelLower.includes('must') || labelLower.includes('required') || labelLower.includes('critical')) {
      return 10;
    }
    if (labelLower.includes('brand') || labelLower.includes('goal') || labelLower.includes('objective')) {
      return 9;
    }
    if (labelLower.includes('preference') || labelLower.includes('style')) {
      return 7;
    }
    if (fieldType === 'file' || fieldType === 'url') {
      return 7;
    }
    if (fieldType === 'textarea' || fieldType === 'text') {
      return 6;
    }

    return 5;
  }

  generateSummary(label, content) {
    const contentStr = String(content);
    const maxLength = 200;

    if (contentStr.length <= maxLength) {
      return `${label}: ${contentStr}`;
    }

    return `${label}: ${contentStr.substring(0, maxLength)}...`;
  }

  extractTags(label, content) {
    const tags = [];
    const text = `${label} ${content}`.toLowerCase();

    const keywords = [
      'responsive', 'mobile', 'desktop', 'modern', 'minimal', 'clean',
      'professional', 'friendly', 'corporate', 'creative', 'bold',
      'colorful', 'dark', 'light', 'gradient', 'animation', 'interactive',
      'e-commerce', 'blog', 'portfolio', 'landing', 'dashboard'
    ];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags;
  }

  async extractFromChatMessage(messageId) {
    try {
      const { data: message, error } = await supabase
        .from('aloa_chat_messages')
        .select(`
          *,
          conversation:aloa_chat_conversations(
            id,
            title,
            project_id
          ),
          sender:aloa_user_profiles(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('id', messageId)
        .single();

      if (error || !message) {
        throw new Error('Message not found');
      }

      const knowledgeItems = [];
      const messageContent = message.content;
      const senderRole = message.sender?.role;
      const senderName = message.sender?.full_name || 'Unknown';
      const conversationTitle = message.conversation?.title || 'Chat';

      // Analyze message content for key information
      const category = this.categorizeChatMessage(messageContent, senderRole);
      const importance = this.calculateChatImportance(messageContent, senderRole);
      const tags = this.extractChatTags(messageContent);

      if (messageContent && messageContent.trim().length > 0) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'chat_message',
          source_id: messageId,
          source_name: `${conversationTitle} - ${senderName}`,
          content_type: 'text',
          content: messageContent,
          content_summary: this.generateChatSummary(messageContent, senderName),
          category: category,
          tags: tags,
          importance_score: importance,
          extracted_by: 'system',
          extraction_confidence: 0.9,
          processed_at: new Date().toISOString(),
          is_current: true,
          metadata: {
            sender_role: senderRole,
            sender_name: senderName,
            conversation_id: message.conversation_id,
            message_timestamp: message.created_at
          }
        });
      }

      // Handle attachments if present
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          knowledgeItems.push({
            project_id: this.projectId,
            source_type: 'chat_attachment',
            source_id: `${messageId}_${attachment.id || attachment.name}`,
            source_name: `${conversationTitle} - Attachment: ${attachment.name}`,
            source_url: attachment.url,
            content_type: 'structured_data',
            content: JSON.stringify(attachment),
            content_summary: `Attachment shared in chat: ${attachment.name} (${attachment.type || 'file'})`,
            category: 'inspiration',
            tags: ['attachment', 'file', senderRole?.includes('client') ? 'client_provided' : 'agency_provided'],
            importance_score: 6,
            extracted_by: 'system',
            extraction_confidence: 1.0,
            processed_at: new Date().toISOString(),
            is_current: true
          });
        }
      }

      if (knowledgeItems.length > 0) {
        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          // Error inserting knowledge items
        }
      }

      // Mark as processed in queue
      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('source_id', messageId)
        .eq('source_type', 'chat_message');

      return knowledgeItems;
    } catch (error) {
      // Error extracting from chat message
      await supabase
        .from('aloa_knowledge_extraction_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          attempts: 1
        })
        .eq('source_id', messageId)
        .eq('source_type', 'chat_message');

      throw error;
    }
  }

  categorizeChatMessage(content, senderRole) {
    const contentLower = content.toLowerCase();
    const isClient = senderRole?.includes('client');

    // Check for specific content patterns
    if (contentLower.includes('brand') || contentLower.includes('logo') || contentLower.includes('identity')) {
      return 'brand_identity';
    }
    if (contentLower.includes('color') || contentLower.includes('palette') || contentLower.includes('theme')) {
      return 'design_preferences';
    }
    if (contentLower.includes('tone') || contentLower.includes('voice') || contentLower.includes('content')) {
      return 'content_strategy';
    }
    if (contentLower.includes('feature') || contentLower.includes('function') || contentLower.includes('need') || contentLower.includes('want')) {
      return 'functionality';
    }
    if (contentLower.includes('user') || contentLower.includes('customer') || contentLower.includes('audience')) {
      return 'target_audience';
    }
    if (contentLower.includes('goal') || contentLower.includes('objective') || contentLower.includes('success')) {
      return 'business_goals';
    }
    if (contentLower.includes('technical') || contentLower.includes('api') || contentLower.includes('integration')) {
      return 'technical_specs';
    }
    if (isClient && (contentLower.includes('like') || contentLower.includes('dislike') || contentLower.includes('prefer') || contentLower.includes('feedback'))) {
      return 'feedback';
    }
    if (contentLower.includes('example') || contentLower.includes('reference') || contentLower.includes('similar')) {
      return 'inspiration';
    }

    // Default based on sender role
    return isClient ? 'feedback' : 'project_info';
  }

  calculateChatImportance(content, senderRole) {
    const contentLower = content.toLowerCase();
    const isClient = senderRole?.includes('client');

    // High importance patterns
    if (contentLower.includes('must') || contentLower.includes('critical') || contentLower.includes('requirement')) {
      return 9;
    }
    if (contentLower.includes('important') || contentLower.includes('priority') || contentLower.includes('essential')) {
      return 8;
    }
    if (isClient && (contentLower.includes('want') || contentLower.includes('need') || contentLower.includes('expect'))) {
      return 8;
    }
    if (contentLower.includes('goal') || contentLower.includes('objective') || contentLower.includes('deadline')) {
      return 7;
    }
    if (contentLower.includes('prefer') || contentLower.includes('like') || contentLower.includes('dislike')) {
      return 6;
    }

    // Base importance on role and length
    const baseImportance = isClient ? 6 : 5;
    const lengthBonus = Math.min(2, Math.floor(content.length / 200));

    return Math.min(10, baseImportance + lengthBonus);
  }

  extractChatTags(content) {
    const tags = ['chat', 'conversation'];
    const contentLower = content.toLowerCase();

    // Add specific tags based on content
    const tagPatterns = {
      'urgent': ['urgent', 'asap', 'immediately'],
      'question': ['?', 'how', 'what', 'when', 'where', 'why'],
      'decision': ['decide', 'decision', 'choose', 'select'],
      'approval': ['approve', 'approved', 'confirm', 'confirmed'],
      'revision': ['change', 'revise', 'update', 'modify'],
      'concern': ['concern', 'worried', 'issue', 'problem'],
      'positive': ['love', 'great', 'excellent', 'perfect'],
      'negative': ['dislike', 'hate', 'bad', 'poor']
    };

    for (const [tag, patterns] of Object.entries(tagPatterns)) {
      if (patterns.some(pattern => contentLower.includes(pattern))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  generateChatSummary(content, senderName) {
    const maxLength = 200;
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    if (cleanContent.length <= maxLength) {
      return `${senderName}: ${cleanContent}`;
    }

    // Try to cut at sentence boundary
    let summary = cleanContent.substring(0, maxLength);
    const lastPeriod = summary.lastIndexOf('.');
    const lastQuestion = summary.lastIndexOf('?');
    const lastExclamation = summary.lastIndexOf('!');

    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
    if (lastSentenceEnd > maxLength * 0.7) {
      summary = summary.substring(0, lastSentenceEnd + 1);
    } else {
      summary = summary.substring(0, maxLength) + '...';
    }

    return `${senderName}: ${summary}`;
  }

  async processExtractionQueue() {
    try {
      const { data: queueItems, error } = await supabase
        .from('aloa_knowledge_extraction_queue')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('status', 'pending')
        .lt('attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        // Error fetching queue items
        return;
      }

      for (const item of queueItems) {
        await supabase
          .from('aloa_knowledge_extraction_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        try {
          switch (item.source_type) {
            case 'form_response':
              await this.extractFromFormResponse(item.source_id);
              break;
            case 'file_document':
              await this.extractFromFile(item.source_id);
              break;
            case 'chat_message':
              await this.extractFromChatMessage(item.source_id);
              break;
            case 'website_content':
              break;
            default:
              // Unknown source type
          }
        } catch (error) {
          // Error processing queue item
        }
      }
    } catch (error) {
      // Error processing extraction queue
    }
  }
}
