-- Complete Automatic Knowledge Extraction System with Database Triggers
-- This ensures knowledge is extracted automatically for ALL project activities
-- Run this after the knowledge table creation script

-- ============================================
-- 1. DROP EXISTING TRIGGERS (Clean slate)
-- ============================================

DROP TRIGGER IF EXISTS project_knowledge_trigger ON aloa_projects;
DROP TRIGGER IF EXISTS applet_interaction_knowledge_trigger ON aloa_applet_interactions;
DROP TRIGGER IF EXISTS form_knowledge_trigger ON aloa_forms;
DROP TRIGGER IF EXISTS form_response_knowledge_trigger ON aloa_project_responses;
DROP TRIGGER IF EXISTS file_upload_knowledge_trigger ON aloa_project_files;
DROP TRIGGER IF EXISTS projectlet_knowledge_trigger ON aloa_projectlets;
DROP TRIGGER IF EXISTS applet_config_knowledge_trigger ON aloa_applets;

-- ============================================
-- 2. FUNCTION: Extract Project Metadata
-- ============================================

CREATE OR REPLACE FUNCTION extract_project_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark old knowledge as not current
  UPDATE aloa_project_knowledge
  SET is_current = false
  WHERE project_id = NEW.id
    AND source_type = 'project_brief';

  -- Insert updated project knowledge
  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.id,
    'project_brief',
    NEW.id::text,
    'Project Information',
    'structured_data',
    jsonb_build_object(
      'name', COALESCE(NEW.name, NEW.project_name),
      'client', NEW.client_name,
      'client_email', NEW.client_email,
      'status', NEW.status,
      'description', NEW.description,
      'live_url', NEW.live_url,
      'staging_url', NEW.staging_url,
      'start_date', NEW.start_date,
      'target_date', NEW.target_launch_date,
      'metadata', NEW.metadata
    )::text,
    CONCAT('Project: ', COALESCE(NEW.name, NEW.project_name), ' for ', NEW.client_name),
    'business_goals',
    ARRAY['project', 'client', 'overview', NEW.status],
    10,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. FUNCTION: Extract Applet Interactions
-- ============================================

CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- Get applet details
  SELECT * INTO applet_record
  FROM aloa_applets
  WHERE id = NEW.applet_id;

  -- Skip if no applet found
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Determine category and summary based on applet type
  CASE applet_record.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := CONCAT(
        'Tone of Voice: ',
        COALESCE(
          (NEW.data->'form_progress'->>'selectedTone')::text,
          (NEW.data->'form_progress'->>'toneName')::text,
          'Tone selection recorded'
        )
      );
      knowledge_tags := ARRAY['tone_of_voice', 'content', 'brand_voice'];

    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := CONCAT(
        'Color Palette: ',
        COALESCE(
          (NEW.data->'form_progress'->>'paletteName')::text,
          'Color preferences selected'
        )
      );
      knowledge_tags := ARRAY['colors', 'design', 'visual_identity'];

    WHEN 'sitemap_builder' THEN
      knowledge_category := 'functionality';
      knowledge_summary := 'Site structure and navigation defined';
      knowledge_tags := ARRAY['sitemap', 'navigation', 'structure'];

    WHEN 'link_submission' THEN
      knowledge_category := 'inspiration';
      knowledge_summary := 'Reference links and inspiration materials provided';
      knowledge_tags := ARRAY['references', 'inspiration', 'examples'];

    ELSE
      knowledge_category := 'functionality';
      knowledge_summary := CONCAT(applet_record.type, ' interaction recorded');
      knowledge_tags := ARRAY[applet_record.type, 'client_input'];
  END CASE;

  -- Mark old interactions as not current (if updating)
  IF TG_OP = 'UPDATE' THEN
    UPDATE aloa_project_knowledge
    SET is_current = false
    WHERE project_id = NEW.project_id
      AND source_type = 'applet_interaction'
      AND source_id = NEW.id::text;
  END IF;

  -- Insert knowledge
  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.project_id,
    'applet_interaction',
    NEW.id::text,
    CONCAT(applet_record.name, ' - ', NEW.interaction_type),
    'structured_data',
    NEW.data::text,
    knowledge_summary,
    knowledge_category,
    knowledge_tags,
    8,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. FUNCTION: Extract Form Definitions
-- ============================================

CREATE OR REPLACE FUNCTION extract_form_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only extract if it's a project form
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Mark old form definition as not current
  IF TG_OP = 'UPDATE' THEN
    UPDATE aloa_project_knowledge
    SET is_current = false
    WHERE project_id = NEW.project_id
      AND source_type = 'team_notes'
      AND source_id = NEW.id::text;
  END IF;

  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.project_id,
    'team_notes',
    NEW.id::text,
    CONCAT('Form: ', NEW.title),
    'structured_data',
    jsonb_build_object(
      'title', NEW.title,
      'description', NEW.description,
      'sections', NEW.sections,
      'status', NEW.status,
      'created_at', NEW.created_at,
      'form_type', NEW.form_type
    )::text,
    CONCAT('Form created: ', NEW.title, ' - ', COALESCE(NEW.description, '')),
    'functionality',
    ARRAY['form', 'data_collection', 'structure', COALESCE(NEW.form_type, 'functionality')],
    7,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNCTION: Extract Form Responses
-- ============================================

CREATE OR REPLACE FUNCTION extract_form_response_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  form_record RECORD;
  response_summary TEXT;
BEGIN
  -- Get form details
  SELECT * INTO form_record
  FROM aloa_forms
  WHERE id = NEW.form_id;

  -- Only process if form belongs to a project
  IF form_record.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create summary
  response_summary := CONCAT(
    'Form response submitted for: ',
    form_record.title,
    ' by ',
    COALESCE(NEW.respondent_email, 'anonymous user')
  );

  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    form_record.project_id,
    'form_response',
    NEW.id::text,
    CONCAT('Response: ', form_record.title),
    'structured_data',
    jsonb_build_object(
      'form_title', form_record.title,
      'form_id', NEW.form_id,
      'response_data', NEW.response_data,
      'respondent_email', NEW.respondent_email,
      'submitted_at', NEW.submitted_at
    )::text,
    response_summary,
    'feedback',
    ARRAY['form_response', 'client_feedback', COALESCE(form_record.form_type, 'functionality')],
    9,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNCTION: Extract File Uploads
-- ============================================

CREATE OR REPLACE FUNCTION extract_file_upload_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  file_category TEXT;
BEGIN
  -- Determine category based on file type
  file_category := CASE
    WHEN NEW.category = 'final-deliverables' THEN 'deliverables'
    WHEN NEW.category = 'work-in-progress' THEN 'progress'
    WHEN NEW.category = 'brand-assets' THEN 'brand_identity'
    WHEN NEW.category = 'content' THEN 'content_strategy'
    ELSE 'inspiration'
  END;

  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.project_id,
    'file_document',
    NEW.id::text,
    CONCAT('File: ', NEW.file_name),
    'file_metadata',
    jsonb_build_object(
      'file_name', NEW.file_name,
      'file_type', NEW.file_type,
      'file_size', NEW.file_size,
      'category', NEW.category,
      'description', NEW.description,
      'uploaded_by', NEW.uploaded_by,
      'file_url', NEW.file_url
    )::text,
    CONCAT('File uploaded: ', NEW.file_name, ' (', NEW.category, ')'),
    file_category,
    ARRAY['file', NEW.category, COALESCE(NEW.file_type, 'document')],
    6,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION: Extract Projectlet Updates
-- ============================================

CREATE OR REPLACE FUNCTION extract_projectlet_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark old projectlet knowledge as not current
  IF TG_OP = 'UPDATE' THEN
    UPDATE aloa_project_knowledge
    SET is_current = false
    WHERE project_id = NEW.project_id
      AND source_type = 'team_notes'
      AND source_id = NEW.id::text;
  END IF;

  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.project_id,
    'team_notes',
    NEW.id::text,
    CONCAT('Milestone: ', NEW.name),
    'structured_data',
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'type', NEW.type,
      'status', NEW.status,
      'sequence_order', NEW.sequence_order,
      'completion_date', NEW.completion_date
    )::text,
    CONCAT('Milestone ', NEW.name, ' - Status: ', NEW.status),
    'business_goals',
    ARRAY['milestone', NEW.status, NEW.type],
    7,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCTION: Extract Applet Configuration Changes
-- ============================================

CREATE OR REPLACE FUNCTION extract_applet_config_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  config_summary TEXT;
BEGIN
  -- Only process if applet has significant configuration
  IF NEW.config IS NULL OR NEW.config = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Only process if config actually changed (for updates)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.config IS NOT DISTINCT FROM OLD.config THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Create summary based on applet type
  config_summary := CASE NEW.type
    WHEN 'form' THEN CONCAT('Form applet configured: ', NEW.name)
    WHEN 'link_submission' THEN CONCAT('Link submission configured: ', NEW.name)
    WHEN 'palette_cleanser' THEN CONCAT('Color palette tool configured: ', NEW.name)
    WHEN 'tone_of_voice' THEN CONCAT('Tone of voice selector configured: ', NEW.name)
    WHEN 'sitemap_builder' THEN CONCAT('Sitemap builder configured: ', NEW.name)
    ELSE CONCAT('Applet configured: ', NEW.name)
  END;

  -- Mark old config as not current
  IF TG_OP = 'UPDATE' THEN
    UPDATE aloa_project_knowledge
    SET is_current = false
    WHERE project_id = NEW.project_id
      AND source_type = 'team_notes'
      AND source_id = NEW.id::text;
  END IF;

  INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    NEW.project_id,
    'team_notes',
    NEW.id::text,
    CONCAT('Applet Config: ', NEW.name),
    'structured_data',
    jsonb_build_object(
      'name', NEW.name,
      'type', NEW.type,
      'config', NEW.config,
      'sequence_order', NEW.sequence_order,
      'is_required', NEW.is_required
    )::text,
    config_summary,
    'functionality',
    ARRAY['configuration', NEW.type],
    5,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. CREATE ALL TRIGGERS
-- ============================================

-- Project changes trigger
CREATE TRIGGER project_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_projects
FOR EACH ROW
EXECUTE FUNCTION extract_project_knowledge();

-- Applet interaction trigger
CREATE TRIGGER applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

-- Form definition trigger
CREATE TRIGGER form_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_forms
FOR EACH ROW
EXECUTE FUNCTION extract_form_knowledge();

-- Form response trigger
CREATE TRIGGER form_response_knowledge_trigger
AFTER INSERT ON aloa_project_responses
FOR EACH ROW
EXECUTE FUNCTION extract_form_response_knowledge();

-- File upload trigger
CREATE TRIGGER file_upload_knowledge_trigger
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_file_upload_knowledge();

-- Projectlet trigger
CREATE TRIGGER projectlet_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_projectlets
FOR EACH ROW
EXECUTE FUNCTION extract_projectlet_knowledge();

-- Applet configuration trigger
CREATE TRIGGER applet_config_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applets
FOR EACH ROW
EXECUTE FUNCTION extract_applet_config_knowledge();

-- ============================================
-- 10. RETROACTIVE EXTRACTION
-- ============================================

-- Extract all existing projects
INSERT INTO aloa_project_knowledge (
  project_id,
  source_type,
  source_id,
  source_name,
  content_type,
  content,
  content_summary,
  category,
  tags,
  importance_score,
  extracted_by,
  extraction_confidence,
  processed_at,
  is_current
)
SELECT
  id,
  'project_brief',
  id::text,
  'Project Information',
  'structured_data',
  jsonb_build_object(
    'name', COALESCE(name, project_name),
    'client', client_name,
    'client_email', client_email,
    'status', status,
    'description', description,
    'live_url', live_url,
    'staging_url', staging_url,
    'start_date', start_date,
    'target_date', target_launch_date,
    'metadata', metadata
  )::text,
  CONCAT('Project: ', COALESCE(name, project_name), ' for ', client_name),
  'business_goals',
  ARRAY['project', 'client', 'overview'],
  10,
  'retroactive_extraction',
  1.0,
  NOW(),
  true
FROM aloa_projects
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_project_knowledge k
  WHERE k.project_id = aloa_projects.id
  AND k.source_type = 'project_brief'
);

-- Extract all existing applet interactions
INSERT INTO aloa_project_knowledge (
  project_id,
  source_type,
  source_id,
  source_name,
  content_type,
  content,
  content_summary,
  category,
  tags,
  importance_score,
  extracted_by,
  extraction_confidence,
  processed_at,
  is_current
)
SELECT
  ai.project_id,
  'applet_interaction',
  ai.id::text,
  CONCAT(a.name, ' - ', ai.interaction_type),
  'structured_data',
  ai.data::text,
  CASE a.type
    WHEN 'tone_of_voice' THEN CONCAT('Tone: ', COALESCE((ai.data->'form_progress'->>'selectedTone')::text, 'Selected'))
    WHEN 'palette_cleanser' THEN 'Color palette preferences selected'
    WHEN 'sitemap_builder' THEN 'Site structure defined'
    WHEN 'link_submission' THEN 'Reference links provided'
    ELSE CONCAT(a.type, ' interaction')
  END,
  CASE a.type
    WHEN 'tone_of_voice' THEN 'content_strategy'
    WHEN 'palette_cleanser' THEN 'design_preferences'
    WHEN 'sitemap_builder' THEN 'functionality'
    WHEN 'link_submission' THEN 'inspiration'
    ELSE 'functionality'
  END,
  ARRAY[a.type::text, 'client_input'],
  8,
  'retroactive_extraction',
  1.0,
  NOW(),
  true
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
WHERE ai.data IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM aloa_project_knowledge k
  WHERE k.project_id = ai.project_id
  AND k.source_type = 'applet_interaction'
  AND k.source_id = ai.id::text
);

-- Extract all existing projectlets
INSERT INTO aloa_project_knowledge (
  project_id,
  source_type,
  source_id,
  source_name,
  content_type,
  content,
  content_summary,
  category,
  tags,
  importance_score,
  extracted_by,
  extraction_confidence,
  processed_at,
  is_current
)
SELECT
  project_id,
  'team_notes',
  id::text,
  CONCAT('Milestone: ', name),
  'structured_data',
  jsonb_build_object(
    'name', name,
    'description', description,
    'type', type,
    'status', status,
    'sequence_order', sequence_order
  )::text,
  CONCAT('Milestone ', name, ' - Status: ', status),
  'business_goals',
  ARRAY['milestone', status],
  7,
  'retroactive_extraction',
  1.0,
  NOW(),
  true
FROM aloa_projectlets
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_project_knowledge k
  WHERE k.project_id = aloa_projectlets.project_id
  AND k.source_type = 'team_notes'
  AND k.source_id = aloa_projectlets.id::text
);

-- ============================================
-- 11. VERIFICATION QUERY
-- ============================================

-- Count extracted knowledge by type
SELECT
  source_type,
  category,
  COUNT(*) as count,
  MAX(processed_at) as last_extracted
FROM aloa_project_knowledge
WHERE is_current = true
GROUP BY source_type, category
ORDER BY source_type, category;