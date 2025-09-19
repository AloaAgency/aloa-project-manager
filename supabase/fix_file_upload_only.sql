-- Safer fix - ONLY fix the file upload trigger without breaking other knowledge extraction
-- This specifically targets only the file upload trigger issue

-- First, let's see what triggers are currently on aloa_project_files
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'aloa_project_files';

-- Only drop the specific file upload knowledge extraction triggers
DROP TRIGGER IF EXISTS extract_knowledge_on_file_upload ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS trigger_extract_knowledge_from_file_upload ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS handle_file_upload_knowledge_trigger ON aloa_project_files CASCADE;

-- Drop only the file upload related functions (not other knowledge functions)
DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;
DROP FUNCTION IF EXISTS handle_file_upload_knowledge() CASCADE;

-- Create a working version of the file upload knowledge extraction
CREATE OR REPLACE FUNCTION extract_knowledge_from_file_upload()
RETURNS TRIGGER AS $$
DECLARE
  file_category TEXT;
BEGIN
  -- Skip if file is being deleted or is a folder
  IF NEW.is_folder = true THEN
    RETURN NEW;
  END IF;

  -- Only proceed if the knowledge table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_project_knowledge'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
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
    -- IMPORTANT: Using NEW.url NOT NEW.file_url
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
        'file_url', COALESCE(NEW.url, '')  -- Use url field with fallback
      )::text,
      CONCAT('File uploaded: ', NEW.file_name, ' (', COALESCE(NEW.category, 'general'), ')'),
      file_category,
      ARRAY['file', COALESCE(NEW.category, 'general'), COALESCE(NEW.file_type, 'document')],
      6,
      'system_trigger',
      1.0,
      NOW(),
      true
    );

  EXCEPTION WHEN OTHERS THEN
    -- If knowledge extraction fails, log but don't fail the file upload
    RAISE WARNING 'Knowledge extraction failed for file %: %', NEW.file_name, SQLERRM;
    -- Still return NEW so the file upload succeeds
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER extract_knowledge_on_file_upload
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_file_upload();

-- Verify what triggers are now active
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'aloa_project_files'
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'File upload trigger has been safely fixed. Knowledge extraction is preserved but will not block file uploads if it fails.';
END $$;