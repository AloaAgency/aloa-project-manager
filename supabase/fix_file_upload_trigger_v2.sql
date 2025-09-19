-- Fix the file upload trigger issue - Version 2
-- This ensures the trigger is completely removed and recreated

-- First, check what triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'aloa_project_files';

-- Drop ALL existing triggers on aloa_project_files
DROP TRIGGER IF EXISTS extract_knowledge_on_file_upload ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS extract_knowledge_from_file_upload ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS knowledge_extraction_file_upload ON aloa_project_files CASCADE;

-- Drop any existing functions with similar names
DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;
DROP FUNCTION IF EXISTS extract_knowledge_on_file_upload() CASCADE;
DROP FUNCTION IF EXISTS knowledge_extraction_file_upload() CASCADE;

-- Now check if the trigger still references file_url
-- by looking at the actual trigger function definition
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%file%upload%';

-- Create a NEW function with a different name to ensure fresh start
CREATE OR REPLACE FUNCTION handle_file_upload_knowledge()
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
  -- Using NEW.url NOT NEW.file_url
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
      'file_url', COALESCE(NEW.url, '')  -- Use url field, with fallback
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Knowledge extraction failed for file upload: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with the new function
CREATE TRIGGER handle_file_upload_knowledge_trigger
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION handle_file_upload_knowledge();

-- Verify the fix
SELECT
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table = 'aloa_project_files';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'File upload trigger has been fixed. The trigger now uses the correct field name (url) and includes error handling.';
END $$;