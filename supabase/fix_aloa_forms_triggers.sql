-- Fix triggers that incorrectly reference NEW.project_id on aloa_forms table
-- The column is actually aloa_project_id

-- First, drop ALL existing knowledge extraction triggers on aloa_forms
DROP TRIGGER IF EXISTS extract_form_knowledge_trigger ON aloa_forms;
DROP TRIGGER IF EXISTS form_knowledge_trigger ON aloa_forms;
DROP TRIGGER IF EXISTS extract_form_response_knowledge_trigger ON aloa_form_responses;
DROP TRIGGER IF EXISTS update_form_submission_count_trigger ON aloa_form_responses;

-- Fix BOTH functions that might have the bug

-- Function 1: extract_knowledge_from_form
CREATE OR REPLACE FUNCTION extract_knowledge_from_form()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if we have a project ID
  IF NEW.aloa_project_id IS NOT NULL THEN
    -- Use aloa_project_id instead of project_id
    INSERT INTO aloa_knowledge_extraction_queue (
      project_id,
      source_type,
      source_id,
      extraction_status,
      created_at
    ) VALUES (
      NEW.aloa_project_id,  -- Fixed: was NEW.project_id
      'form',
      NEW.id::text,
      'pending',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: extract_form_knowledge (the other function)
CREATE OR REPLACE FUNCTION extract_form_knowledge()
RETURNS TRIGGER AS $$
BEGIN
  -- Use aloa_project_id instead of project_id
  IF NEW.aloa_project_id IS NOT NULL THEN
    INSERT INTO aloa_knowledge_extraction_queue (
      project_id,
      source_type,
      source_id,
      extraction_status,
      created_at
    ) VALUES (
      NEW.aloa_project_id,  -- Fixed: was NEW.project_id
      'form',
      NEW.id::text,
      'pending',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the corrected function
CREATE TRIGGER extract_form_knowledge_trigger
AFTER INSERT ON aloa_forms
FOR EACH ROW
WHEN (NEW.aloa_project_id IS NOT NULL)
EXECUTE FUNCTION extract_knowledge_from_form();

-- Also fix the form responses trigger if it exists
CREATE OR REPLACE FUNCTION extract_knowledge_from_form_response()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get project ID from the form
  SELECT aloa_project_id INTO v_project_id
  FROM aloa_forms
  WHERE id = NEW.aloa_form_id;

  -- Only queue if we have a project ID
  IF v_project_id IS NOT NULL THEN
    INSERT INTO aloa_knowledge_extraction_queue (
      project_id,
      source_type,
      source_id,
      extraction_status,
      created_at
    ) VALUES (
      v_project_id,
      'form_response',
      NEW.id::text,
      'pending',
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for form responses
CREATE TRIGGER extract_form_response_knowledge_trigger
AFTER INSERT ON aloa_form_responses
FOR EACH ROW
EXECUTE FUNCTION extract_knowledge_from_form_response();

-- Also recreate the form submission count trigger if needed
CREATE OR REPLACE FUNCTION update_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the submission count on the form
  UPDATE aloa_forms
  SET submission_count = COALESCE(submission_count, 0) + 1
  WHERE id = NEW.aloa_form_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for form submission count
CREATE TRIGGER update_form_submission_count_trigger
AFTER INSERT ON aloa_form_responses
FOR EACH ROW
EXECUTE FUNCTION update_form_submission_count();

-- Verify the fix
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid::regclass::text IN ('aloa_forms', 'aloa_form_responses')
ORDER BY table_name, trigger_name;