-- Comprehensive fix for ALL file upload triggers
-- This will fix all triggers that might be referencing file_url instead of url

-- First, show current state
SELECT 'Current triggers on aloa_project_files:' as info;
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'aloa_project_files';

-- Drop ALL file upload knowledge extraction triggers (but keep the updated_at trigger)
DROP TRIGGER IF EXISTS extract_knowledge_on_file_upload ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS file_upload_knowledge_trigger ON aloa_project_files CASCADE;
DROP TRIGGER IF EXISTS trigger_extract_knowledge_from_file_upload ON aloa_project_files CASCADE;

-- Drop the functions too
DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;
DROP FUNCTION IF EXISTS extract_file_upload_knowledge() CASCADE;

-- Check what functions might be using file_url
SELECT 'Functions that might reference file_url:' as info;
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%file_url%';

-- Create ONE working file upload knowledge extraction function
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
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_project_knowledge'
  ) THEN
    BEGIN
      -- Map file categories to knowledge categories
      file_category := CASE COALESCE(NEW.category, 'general')
        WHEN 'design' THEN 'design_preferences'
        WHEN 'content' THEN 'content_strategy'
        WHEN 'technical' THEN 'technical_specs'
        WHEN 'reference' THEN 'inspiration'
        WHEN 'feedback' THEN 'feedback'
        WHEN 'brand' THEN 'brand_identity'
        ELSE 'general'
      END;

      -- Insert knowledge item for the uploaded file
      -- CRITICAL: Using NEW.url NOT NEW.file_url
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
          'category', COALESCE(NEW.category, 'general'),
          'description', NEW.description,
          'uploaded_by', NEW.uploaded_by,
          'url', COALESCE(NEW.url, ''),  -- Using url field
          'storage_path', COALESCE(NEW.storage_path, '')
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

      RAISE NOTICE 'Knowledge extracted for file %', NEW.file_name;

    EXCEPTION WHEN OTHERS THEN
      -- If knowledge extraction fails, log but don't fail the file upload
      RAISE WARNING 'Knowledge extraction failed for file %: %', NEW.file_name, SQLERRM;
      -- Still return NEW so the file upload succeeds
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ONLY ONE trigger for file upload knowledge extraction
CREATE TRIGGER extract_knowledge_on_file_upload
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_file_upload();

-- Verify final state
SELECT 'Final triggers on aloa_project_files:' as info;
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'aloa_project_files'
ORDER BY trigger_name;

-- Test that the url column exists on aloa_project_files
SELECT 'Columns on aloa_project_files table:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'aloa_project_files'
AND column_name IN ('url', 'file_url', 'storage_path')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '
  ========================================
  File upload triggers have been fixed!
  - Removed duplicate/conflicting triggers
  - Fixed field reference (url not file_url)
  - Added error handling
  - Files will still be added to knowledge base
  ========================================';
END $$;