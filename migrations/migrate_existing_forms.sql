-- Migration script to backup existing forms data to new project management structure
-- This preserves all existing forms while we transition to the new system

-- Create a backup table for existing forms (if not exists)
CREATE TABLE IF NOT EXISTS forms_backup AS 
SELECT * FROM forms;

-- Create a backup table for existing responses (if not exists)
CREATE TABLE IF NOT EXISTS responses_backup AS 
SELECT * FROM responses;

-- Create a mapping table to track which old forms belong to which new projects
CREATE TABLE IF NOT EXISTS form_to_project_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  old_form_id UUID REFERENCES forms(id),
  new_project_id UUID REFERENCES projects(id),
  new_form_id UUID REFERENCES project_forms(id),
  migration_date TIMESTAMPTZ DEFAULT NOW()
);

-- Function to migrate a form to the new project structure
CREATE OR REPLACE FUNCTION migrate_form_to_project(
  p_form_id UUID,
  p_project_name TEXT DEFAULT 'Migrated Project',
  p_client_email TEXT DEFAULT 'migrated@example.com'
)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_projectlet_id UUID;
  v_new_form_id UUID;
  v_form RECORD;
BEGIN
  -- Get the original form
  SELECT * INTO v_form FROM forms WHERE id = p_form_id;
  
  IF v_form IS NULL THEN
    RAISE EXCEPTION 'Form not found: %', p_form_id;
  END IF;
  
  -- Create a new project for this form
  INSERT INTO projects (
    project_name,
    client_name,
    client_email,
    status,
    created_at
  ) VALUES (
    COALESCE(v_form.title, p_project_name),
    'Migrated Client',
    p_client_email,
    'in_progress',
    v_form.created_at
  ) RETURNING id INTO v_project_id;
  
  -- Create a projectlet for this form
  INSERT INTO projectlets (
    project_id,
    name,
    type,
    sequence_order,
    status
  ) VALUES (
    v_project_id,
    v_form.title,
    'form',
    1,
    'available'
  ) RETURNING id INTO v_projectlet_id;
  
  -- Create the project form
  INSERT INTO project_forms (
    project_id,
    projectlet_id,
    title,
    description,
    form_type,
    fields,
    is_active,
    created_at
  ) VALUES (
    v_project_id,
    v_projectlet_id,
    v_form.title,
    v_form.description,
    'page_content', -- Default type for migrated forms
    v_form.fields,
    COALESCE(v_form.is_active, true),
    v_form.created_at
  ) RETURNING id INTO v_new_form_id;
  
  -- Update the projectlet with the form_id
  UPDATE projectlets SET form_id = v_new_form_id WHERE id = v_projectlet_id;
  
  -- Migrate responses for this form
  INSERT INTO project_responses (
    form_id,
    project_id,
    projectlet_id,
    data,
    submitted_at
  )
  SELECT 
    v_new_form_id,
    v_project_id,
    v_projectlet_id,
    data,
    submitted_at
  FROM responses
  WHERE form_id = p_form_id;
  
  -- Record the mapping
  INSERT INTO form_to_project_mapping (
    old_form_id,
    new_project_id,
    new_form_id
  ) VALUES (
    p_form_id,
    v_project_id,
    v_new_form_id
  );
  
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- Example: Migrate all existing forms (commented out for safety)
-- DO $$
-- DECLARE
--   v_form RECORD;
-- BEGIN
--   FOR v_form IN SELECT id FROM forms LOOP
--     PERFORM migrate_form_to_project(v_form.id);
--   END LOOP;
-- END $$;