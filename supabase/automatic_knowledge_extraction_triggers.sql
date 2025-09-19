-- Automatic Knowledge Extraction Database Triggers
-- This ensures knowledge is extracted automatically for all project activities

-- 1. Function to extract knowledge from project changes
CREATE OR REPLACE FUNCTION extract_project_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert knowledge for project creation/updates
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
    'project_metadata',
    NEW.id::text,
    'Project Information',
    'structured_data',
    jsonb_build_object(
      'name', COALESCE(NEW.name, NEW.project_name),
      'client', NEW.client_name,
      'client_email', NEW.client_email,
      'status', NEW.status,
      'budget', NEW.budget,
      'description', NEW.description,
      'live_url', NEW.live_url,
      'staging_url', NEW.staging_url,
      'start_date', NEW.start_date,
      'target_date', COALESCE(NEW.target_launch_date, NEW.target_completion_date),
      'metadata', NEW.metadata
    )::text,
    CONCAT('Project: ', COALESCE(NEW.name, NEW.project_name), ' for ', NEW.client_name),
    'project_info',
    ARRAY['project', 'client', 'overview'],
    10,
    'system_trigger',
    1.0,
    NOW(),
    true
  )
  ON CONFLICT (project_id, source_type, source_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    content_summary = EXCLUDED.content_summary,
    processed_at = NOW(),
    is_current = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for project creation and updates
DROP TRIGGER IF EXISTS project_knowledge_trigger ON aloa_projects;
CREATE TRIGGER project_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_projects
FOR EACH ROW
EXECUTE FUNCTION extract_project_knowledge();

-- 3. Function to extract knowledge from applet interactions
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  knowledge_summary TEXT;
  knowledge_category TEXT;
BEGIN
  -- Get applet details
  SELECT * INTO applet_record
  FROM aloa_applets
  WHERE id = NEW.applet_id;

  -- Determine category based on applet type
  CASE applet_record.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := CONCAT('Tone of Voice: ', (NEW.data->'form_progress'->>'toneName')::text);
    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := 'Color palette preferences selected';
    WHEN 'sitemap_builder' THEN
      knowledge_category := 'functionality';
      knowledge_summary := 'Site structure and navigation defined';
    WHEN 'link_submission' THEN
      knowledge_category := 'inspiration';
      knowledge_summary := 'Reference links and materials provided';
    ELSE
      knowledge_category := 'general';
      knowledge_summary := CONCAT(applet_record.type, ' interaction recorded');
  END CASE;

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
    ARRAY[applet_record.type, 'applet', 'client_input'],
    8,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for applet interactions
DROP TRIGGER IF EXISTS applet_interaction_knowledge_trigger ON aloa_applet_interactions;
CREATE TRIGGER applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

-- 5. Function to extract knowledge from forms
CREATE OR REPLACE FUNCTION extract_form_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only extract if it's a project form
  IF NEW.project_id IS NOT NULL THEN
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
      'form_structure',
      NEW.id::text,
      CONCAT('Form: ', NEW.title),
      'structured_data',
      jsonb_build_object(
        'title', NEW.title,
        'description', NEW.description,
        'sections', NEW.sections,
        'status', NEW.status
      )::text,
      CONCAT('Form created: ', NEW.title, ' - ', COALESCE(NEW.description, '')),
      'functionality',
      ARRAY['form', 'data_collection', 'structure'],
      7,
      'system_trigger',
      1.0,
      NOW(),
      true
    )
    ON CONFLICT (project_id, source_type, source_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      content_summary = EXCLUDED.content_summary,
      processed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger for forms
DROP TRIGGER IF EXISTS form_knowledge_trigger ON aloa_forms;
CREATE TRIGGER form_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_forms
FOR EACH ROW
EXECUTE FUNCTION extract_form_knowledge();

-- 7. Function to extract knowledge from file uploads
CREATE OR REPLACE FUNCTION extract_file_upload_knowledge()
RETURNS TRIGGER AS $$
BEGIN
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
    'file_upload',
    NEW.id::text,
    CONCAT('File: ', NEW.file_name),
    'file_metadata',
    jsonb_build_object(
      'file_name', NEW.file_name,
      'file_type', NEW.file_type,
      'file_size', NEW.file_size,
      'category', NEW.category,
      'description', NEW.description,
      'uploaded_by', NEW.uploaded_by
    )::text,
    CONCAT('File uploaded: ', NEW.file_name, ' (', NEW.category, ')'),
    CASE
      WHEN NEW.category = 'final-deliverables' THEN 'deliverables'
      WHEN NEW.category = 'work-in-progress' THEN 'progress'
      ELSE 'resources'
    END,
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

-- 8. Trigger for file uploads
DROP TRIGGER IF EXISTS file_upload_knowledge_trigger ON aloa_project_files;
CREATE TRIGGER file_upload_knowledge_trigger
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_file_upload_knowledge();

-- 9. Function to extract knowledge from projectlet changes
CREATE OR REPLACE FUNCTION extract_projectlet_knowledge()
RETURNS TRIGGER AS $$
BEGIN
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
    'projectlet',
    NEW.id::text,
    CONCAT('Milestone: ', NEW.name),
    'structured_data',
    jsonb_build_object(
      'name', NEW.name,
      'description', NEW.description,
      'type', NEW.type,
      'status', NEW.status,
      'order_index', NEW.order_index
    )::text,
    CONCAT('Milestone ', NEW.name, ' - Status: ', NEW.status),
    'project_info',
    ARRAY['milestone', 'projectlet', NEW.status],
    7,
    'system_trigger',
    1.0,
    NOW(),
    true
  )
  ON CONFLICT (project_id, source_type, source_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    content_summary = EXCLUDED.content_summary,
    processed_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger for projectlets
DROP TRIGGER IF EXISTS projectlet_knowledge_trigger ON aloa_projectlets;
CREATE TRIGGER projectlet_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_projectlets
FOR EACH ROW
EXECUTE FUNCTION extract_projectlet_knowledge();

-- 11. Extract existing data retroactively (run once)
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
  'project_metadata',
  id::text,
  'Project Information',
  'structured_data',
  jsonb_build_object(
    'name', COALESCE(name, project_name),
    'client', client_name,
    'client_email', client_email,
    'status', status,
    'budget', budget,
    'description', description,
    'live_url', live_url,
    'staging_url', staging_url,
    'start_date', start_date,
    'target_date', COALESCE(target_launch_date, target_completion_date),
    'metadata', metadata
  )::text,
  CONCAT('Project: ', COALESCE(name, project_name), ' for ', client_name),
  'project_info',
  ARRAY['project', 'client', 'overview'],
  10,
  'retroactive_extraction',
  1.0,
  NOW(),
  true
FROM aloa_projects
ON CONFLICT (project_id, source_type, source_id) DO NOTHING;

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
  CONCAT(a.type, ' interaction from ', ai.user_email),
  CASE a.type
    WHEN 'tone_of_voice' THEN 'content_strategy'
    WHEN 'palette_cleanser' THEN 'design_preferences'
    WHEN 'sitemap_builder' THEN 'functionality'
    WHEN 'link_submission' THEN 'inspiration'
    ELSE 'general'
  END,
  ARRAY[a.type, 'applet', 'client_input'],
  8,
  'retroactive_extraction',
  1.0,
  NOW(),
  true
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
WHERE ai.data IS NOT NULL
ON CONFLICT (project_id, source_type, source_id) DO NOTHING;