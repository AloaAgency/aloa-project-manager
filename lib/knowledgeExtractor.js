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
      const knowledgeItems = [];

      // Basic project information
      if (project.project_name || project.name) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: this.projectId,
          source_name: 'Project Information',
          content_type: 'structured_data',
          content: JSON.stringify({
            name: project.name || project.project_name,
            client: project.client_name,
            client_email: project.client_email,
            status: project.status,
            budget: project.budget
          }),
          content_summary: `Project: ${project.name || project.project_name} for ${project.client_name}`,
          category: 'project_info',
          tags: ['project', 'client', 'overview'],
          importance_score: 10,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      // Project timeline
      if (project.start_date || project.target_completion_date) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_timeline`,
          source_name: 'Project Timeline',
          content_type: 'structured_data',
          content: JSON.stringify({
            start_date: project.start_date,
            target_completion: project.target_completion_date || project.target_launch_date,
            actual_completion: project.actual_completion_date
          }),
          content_summary: `Project timeline: ${project.start_date} to ${project.target_completion_date || project.target_launch_date || 'TBD'}`,
          category: 'project_info',
          tags: ['timeline', 'deadlines', 'schedule'],
          importance_score: 8,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      // URLs and digital assets
      if (project.live_url || project.staging_url) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_urls`,
          source_name: 'Project URLs',
          content_type: 'structured_data',
          content: JSON.stringify({
            live_url: project.live_url,
            staging_url: project.staging_url
          }),
          content_summary: `URLs - Live: ${project.live_url || 'None'}, Staging: ${project.staging_url || 'None'}`,
          category: 'technical_specs',
          tags: ['urls', 'website', 'staging'],
          importance_score: 7,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      // Project description
      if (project.description) {
        knowledgeItems.push({
          project_id: this.projectId,
          source_type: 'project_metadata',
          source_id: `${this.projectId}_description`,
          source_name: 'Project Description',
          content_type: 'text',
          content: project.description,
          content_summary: project.description.substring(0, 200),
          category: 'project_info',
          tags: ['description', 'overview', 'scope'],
          importance_score: 9,
          extracted_by: 'system',
          extraction_confidence: 1.0,
          processed_at: new Date().toISOString(),
          is_current: true
        });
      }

      // Extract from metadata JSON if present
      if (project.metadata && typeof project.metadata === 'object') {
        const metadata = project.metadata;

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

      // Mark old project knowledge as not current before inserting new
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
          console.error('Error inserting project knowledge:', insertError);
        }
      }

      return knowledgeItems;
    } catch (error) {
      console.error('Error extracting from project:', error);
      throw error;
    }
  }

  async extractFromFormResponse(responseId) {
    try {
      const { data: response, error } = await supabase
        .from('aloa_applet_responses')
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
          applet:aloa_applets(
            name,
            type,
            projectlet_id
          )
        `)
        .eq('id', responseId)
        .single();

      if (error || !response) {
        throw new Error('Response not found');
      }

      const knowledgeItems = [];
      const formData = response.response_data;
      const formTitle = response.form?.title || 'Form Response';

      for (const [fieldName, value] of Object.entries(formData)) {
        if (!value || value === '') continue;

        const field = response.form?.aloa_form_fields?.find(f => f.field_name === fieldName);
        const fieldLabel = field?.field_label || fieldName;

        const category = this.categorizeContent(fieldLabel, value);
        const importance = this.calculateImportance(fieldLabel, field?.field_type);

        const content = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const knowledgeItem = {
          project_id: this.projectId,
          source_type: 'form_response',
          source_id: responseId,
          source_name: `${formTitle} - ${fieldLabel}`,
          content_type: field?.field_type === 'file' ? 'structured_data' : 'text',
          content: content,
          content_summary: this.generateSummary(fieldLabel, content),
          category: category,
          tags: this.extractTags(fieldLabel, content),
          importance_score: importance,
          extracted_by: 'system',
          extraction_confidence: 0.95,
          processed_at: new Date().toISOString(),
          is_current: true
        };

        knowledgeItems.push(knowledgeItem);
      }

      if (knowledgeItems.length > 0) {
        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          console.error('Error inserting knowledge items:', insertError);
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
      console.error('Error extracting from form response:', error);

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

      if (knowledgeItems.length > 0) {
        const { error: insertError } = await supabase
          .from('aloa_project_knowledge')
          .insert(knowledgeItems);

        if (insertError) {
          console.error('Error inserting knowledge items:', insertError);
        }
      }

      return knowledgeItems;
    } catch (error) {
      console.error('Error extracting from applet interaction:', error);
      throw error;
    }
  }

  async extractFromFile(fileId) {
    try {
      console.log('Attempting to extract from file with ID:', fileId);

      const { data: file, error } = await supabase
        .from('aloa_project_files')
        .select('*')
        .eq('id', fileId)
        .single();

      console.log('File query result:', { file, error });

      if (error || !file) {
        console.error('File not found in database:', { fileId, error });
        throw new Error('File not found');
      }

      console.log('Extracting knowledge from file:', file.file_name, 'Type:', file.file_type);

      let content = '';
      let summary = '';
      const fileUrl = file.url || file.storage_path;

      // Check file type - handle both mime types and extensions
      const isTextFile = file.file_type?.includes('text') ||
                        file.file_name?.endsWith('.md') ||
                        file.file_name?.endsWith('.txt');
      const isJsonFile = file.file_type === 'application/json' || file.file_name?.endsWith('.json');
      const isCsvFile = file.file_type === 'text/csv' || file.file_name?.endsWith('.csv');

      if (isTextFile || isJsonFile || isCsvFile) {
        // Fetch file content from URL
        if (fileUrl) {
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              console.error('Failed to fetch file content:', response.status);
              throw new Error('Failed to fetch file content');
            }
            content = await response.text();
            summary = content.substring(0, 500);
          } catch (fetchError) {
            console.error('Error fetching file content:', fetchError);
            // Try to get content from storage directly
            if (file.storage_path) {
              const { data, error: downloadError } = await supabase.storage
                .from('project-files')
                .download(file.storage_path);

              if (!downloadError && data) {
                content = await data.text();
                summary = content.substring(0, 500);
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
          console.error('Error parsing JSON:', jsonError);
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
      } else {
        // Not a text file - just store metadata
        summary = `Document: ${file.file_name} (${file.file_type})`;
        content = summary;
      }

      // Only create knowledge item if we have content
      if (!content) {
        console.log('No content extracted from file');
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
        console.error('Error inserting knowledge:', insertError);
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
      console.error('Error extracting from file:', error);

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
      console.error('Error queuing website extraction:', error);
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
        console.error('Error fetching queue items:', error);
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
            case 'website_content':
              break;
            default:
              console.warn('Unknown source type:', item.source_type);
          }
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing extraction queue:', error);
    }
  }
}