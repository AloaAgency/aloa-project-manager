-- Fix the file upload trigger to use 'url' instead of 'file_url'
-- This fixes the error when uploading files

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS extract_knowledge_on_file_upload ON aloa_project_files;
DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;

-- Create updated function with correct field name
CREATE OR REPLACE FUNCTION extract_knowledge_from_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  file_category TEXT;
BEGIN
  -- Skip if file is being deleted or is a folder
  IF NEW.is_folder = true THEN
    RETURN NEW;
  END IF;

  -- Map file categories to knowledge categories
  file_category := CASE NEW.category
    WHEN 'design' THEN 'design_preferences'
    WHEN 'content' THEN 'content_strategy'
    WHEN 'technical' THEN 'technical_specs'
    WHEN 'reference' THEN 'inspiration'
    WHEN 'feedback' THEN 'feedback'
    WHEN 'brand' THEN 'brand_identity'
    ELSE 'general'
  END;

  -- Insert knowledge item for the uploaded file
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
    'file',
    jsonb_build_object(
      'file_name', NEW.file_name,
      'file_type', NEW.file_type,
      'file_size', NEW.file_size,
      'category', NEW.category,
      'description', NEW.description,
      'uploaded_by', NEW.uploaded_by,
      'file_url', NEW.url  -- Changed from NEW.file_url to NEW.url
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

-- Recreate the trigger
CREATE TRIGGER extract_knowledge_on_file_upload
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_file_upload();

-- Also fix any other references to file_url in the knowledge extraction system
-- Update the extract_knowledge_from_form_response function if it exists
CREATE OR REPLACE FUNCTION extract_knowledge_from_form_response()
RETURNS TRIGGER AS $$
DECLARE
  form_record RECORD;
  form_category TEXT;
BEGIN
  -- Get form details
  SELECT * INTO form_record
  FROM aloa_project_forms
  WHERE id = NEW.form_id;

  -- Skip if form not found
  IF form_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map form types to knowledge categories
  form_category := CASE
    WHEN form_record.name ILIKE '%brand%' THEN 'brand_identity'
    WHEN form_record.name ILIKE '%design%' OR form_record.name ILIKE '%style%' THEN 'design_preferences'
    WHEN form_record.name ILIKE '%content%' OR form_record.name ILIKE '%copy%' THEN 'content_strategy'
    WHEN form_record.name ILIKE '%feature%' OR form_record.name ILIKE '%function%' THEN 'functionality'
    WHEN form_record.name ILIKE '%audience%' OR form_record.name ILIKE '%user%' THEN 'target_audience'
    WHEN form_record.name ILIKE '%goal%' OR form_record.name ILIKE '%objective%' THEN 'business_goals'
    WHEN form_record.name ILIKE '%feedback%' OR form_record.name ILIKE '%revision%' THEN 'feedback'
    ELSE 'general'
  END;

  -- Insert knowledge item for the form response
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
    CONCAT('Form Response: ', form_record.name),
    'structured_data',
    jsonb_build_object(
      'form_name', form_record.name,
      'form_description', form_record.description,
      'responses', NEW.response_data,
      'submitted_by', NEW.user_identifier,
      'submitted_at', NEW.created_at
    )::text,
    CONCAT('Response to form: ', form_record.name),
    form_category,
    ARRAY['form_response', form_category],
    8, -- High importance for direct client input
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  -- Add to extraction queue for AI processing
  INSERT INTO aloa_knowledge_extraction_queue (
    project_id,
    source_type,
    source_id,
    data,
    priority,
    created_at
  ) VALUES (
    form_record.project_id,
    'form_response',
    NEW.id::text,
    jsonb_build_object(
      'form_id', NEW.form_id,
      'response_id', NEW.id,
      'form_name', form_record.name,
      'responses', NEW.response_data
    ),
    1, -- High priority
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also ensure the trigger exists for form responses
CREATE TRIGGER extract_knowledge_on_form_response
AFTER INSERT ON aloa_project_responses
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_form_response();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'File upload trigger fixed successfully. File uploads should now work correctly.';
END $$;