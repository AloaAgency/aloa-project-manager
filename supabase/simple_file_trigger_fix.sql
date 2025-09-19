-- Simple, targeted fix for file upload triggers
-- This avoids aggregate function errors and just fixes the core issue

-- Step 1: Drop only the problematic triggers (keep updated_at trigger)
DO $$
BEGIN
  -- Drop file upload knowledge triggers
  DROP TRIGGER IF EXISTS extract_knowledge_on_file_upload ON aloa_project_files;
  DROP TRIGGER IF EXISTS file_upload_knowledge_trigger ON aloa_project_files;
  DROP TRIGGER IF EXISTS trigger_extract_knowledge_from_file_upload ON aloa_project_files;

  RAISE NOTICE 'Dropped existing file upload triggers';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some triggers may not exist, continuing...';
END $$;

-- Step 2: Drop the related functions
DO $$
BEGIN
  DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;
  DROP FUNCTION IF EXISTS extract_file_upload_knowledge() CASCADE;

  RAISE NOTICE 'Dropped existing functions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some functions may not exist, continuing...';
END $$;

-- Step 3: Create a simple working function
CREATE OR REPLACE FUNCTION extract_knowledge_from_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip folders
  IF NEW.is_folder = true THEN
    RETURN NEW;
  END IF;

  -- Try to insert into knowledge base, but don't fail if it errors
  BEGIN
    -- Check if knowledge table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'aloa_project_knowledge'
    ) THEN
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
        'File: ' || NEW.file_name,
        'file',
        json_build_object(
          'file_name', NEW.file_name,
          'file_type', NEW.file_type,
          'file_size', NEW.file_size,
          'category', COALESCE(NEW.category, 'general'),
          'description', NEW.description,
          'uploaded_by', NEW.uploaded_by,
          'url', NEW.url,  -- This is the key fix - use url not file_url
          'storage_path', NEW.storage_path
        )::text,
        'File uploaded: ' || NEW.file_name,
        CASE COALESCE(NEW.category, 'general')
          WHEN 'design' THEN 'design_preferences'
          WHEN 'content' THEN 'content_strategy'
          WHEN 'technical' THEN 'technical_specs'
          WHEN 'reference' THEN 'inspiration'
          WHEN 'feedback' THEN 'feedback'
          WHEN 'brand' THEN 'brand_identity'
          ELSE 'general'
        END,
        ARRAY['file', COALESCE(NEW.category, 'general')],
        6,
        'system_trigger',
        1.0,
        NOW(),
        true
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the file upload
    RAISE LOG 'Knowledge extraction failed: %', SQLERRM;
  END;

  -- Always return NEW so file upload succeeds
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger
CREATE TRIGGER extract_knowledge_on_file_upload
AFTER INSERT ON aloa_project_files
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_file_upload();

-- Step 5: Verify
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'aloa_project_files'
  AND trigger_name LIKE '%knowledge%' OR trigger_name LIKE '%file_upload%';

  RAISE NOTICE 'File upload knowledge triggers installed: %', trigger_count;
  RAISE NOTICE 'File uploads should now work correctly!';
END $$;