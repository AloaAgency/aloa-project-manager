-- Complete migration script for forms separation
-- This handles the migration regardless of what columns exist in the legacy forms table

-- First, add missing columns to aloa_forms if they don't exist
ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT ARRAY['General Information'];

ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "requiresAuth": false,
  "multipleSubmissions": false,
  "showProgressBar": true
}'::jsonb;

-- Migrate forms from legacy table to aloa_forms
-- Using conditional column selection based on what exists
INSERT INTO aloa_forms (
    id,
    title,
    description,
    url_id,
    markdown_content,
    aloa_project_id,
    sections,
    settings,
    status,
    created_at,
    updated_at
)
SELECT 
    f.id,
    f.title,
    f.description,
    f.url_id,
    COALESCE(f.markdown_content, '') as markdown_content,
    f.project_id as aloa_project_id,
    -- Extract sections from form fields if sections column doesn't exist
    CASE 
        WHEN EXISTS (
            SELECT DISTINCT ff.validation->>'section' 
            FROM form_fields ff 
            WHERE ff.form_id = f.id 
            AND ff.validation->>'section' IS NOT NULL
        ) THEN 
            ARRAY(
                SELECT DISTINCT ff.validation->>'section' 
                FROM form_fields ff 
                WHERE ff.form_id = f.id 
                AND ff.validation->>'section' IS NOT NULL
                ORDER BY ff.validation->>'section'
            )
        ELSE 
            ARRAY['General Information']
    END as sections,
    -- Use default settings
    '{
      "requiresAuth": false,
      "multipleSubmissions": false,
      "showProgressBar": true
    }'::jsonb as settings,
    COALESCE(f.status, 'active') as status,
    f.created_at,
    COALESCE(f.updated_at, f.created_at) as updated_at
FROM forms f
WHERE f.project_id IN (SELECT id FROM aloa_projects)
  AND NOT EXISTS (
    SELECT 1 FROM aloa_forms af WHERE af.id = f.id
  );

-- Also migrate forms that don't have a project_id but are referenced by aloa_applets
INSERT INTO aloa_forms (
    id,
    title,
    description,
    url_id,
    markdown_content,
    aloa_project_id,
    sections,
    settings,
    status,
    created_at,
    updated_at
)
SELECT DISTINCT
    f.id,
    f.title,
    f.description,
    f.url_id,
    COALESCE(f.markdown_content, '') as markdown_content,
    NULL as aloa_project_id,
    CASE 
        WHEN EXISTS (
            SELECT DISTINCT ff.validation->>'section' 
            FROM form_fields ff 
            WHERE ff.form_id = f.id 
            AND ff.validation->>'section' IS NOT NULL
        ) THEN 
            ARRAY(
                SELECT DISTINCT ff.validation->>'section' 
                FROM form_fields ff 
                WHERE ff.form_id = f.id 
                AND ff.validation->>'section' IS NOT NULL
                ORDER BY ff.validation->>'section'
            )
        ELSE 
            ARRAY['General Information']
    END as sections,
    '{
      "requiresAuth": false,
      "multipleSubmissions": false,
      "showProgressBar": true
    }'::jsonb as settings,
    COALESCE(f.status, 'active') as status,
    f.created_at,
    COALESCE(f.updated_at, f.created_at) as updated_at
FROM forms f
INNER JOIN aloa_applets aa ON aa.form_id = f.id
WHERE NOT EXISTS (
    SELECT 1 FROM aloa_forms af WHERE af.id = f.id
  );

-- Copy the form fields for these migrated forms
INSERT INTO aloa_form_fields (
    id,
    aloa_form_id,
    field_label,
    field_name,
    field_type,
    required,
    placeholder,
    options,
    validation,
    field_order
)
SELECT 
    ff.id,
    ff.form_id as aloa_form_id,
    ff.field_label,
    ff.field_name,
    ff.field_type,
    ff.required,
    ff.placeholder,
    ff.options,
    ff.validation,
    ff.field_order
FROM form_fields ff
WHERE ff.form_id IN (SELECT id FROM aloa_forms)
  AND NOT EXISTS (
    SELECT 1 FROM aloa_form_fields aff WHERE aff.id = ff.id
  );

-- Copy form responses if they exist
INSERT INTO aloa_form_responses (
    id,
    aloa_form_id,
    response_data,
    submitted_at,
    user_info
)
SELECT 
    fr.id,
    fr.form_id as aloa_form_id,
    fr.response_data,
    fr.submitted_at,
    fr.user_info
FROM form_responses fr
WHERE fr.form_id IN (SELECT id FROM aloa_forms)
  AND NOT EXISTS (
    SELECT 1 FROM aloa_form_responses afr WHERE afr.id = fr.id
  );

-- Copy form response answers if they exist
INSERT INTO aloa_form_response_answers (
    id,
    response_id,
    field_name,
    field_value
)
SELECT 
    fra.id,
    fra.response_id,
    fra.field_name,
    fra.field_value
FROM form_response_answers fra
WHERE fra.response_id IN (SELECT id FROM aloa_form_responses)
  AND NOT EXISTS (
    SELECT 1 FROM aloa_form_response_answers afra WHERE afra.id = fra.id
  );

-- Now fix the foreign key constraints to point to aloa_forms
ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS aloa_applets_form_id_fkey;

ALTER TABLE aloa_applets
ADD CONSTRAINT aloa_applets_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

-- Fix other constraints
ALTER TABLE aloa_form_fields
DROP CONSTRAINT IF EXISTS aloa_form_fields_aloa_form_id_fkey;

ALTER TABLE aloa_form_fields
ADD CONSTRAINT aloa_form_fields_aloa_form_id_fkey
FOREIGN KEY (aloa_form_id)
REFERENCES aloa_forms(id)
ON DELETE CASCADE;

ALTER TABLE aloa_projectlet_steps
DROP CONSTRAINT IF EXISTS aloa_projectlet_steps_form_id_fkey;

ALTER TABLE aloa_projectlet_steps
ADD CONSTRAINT aloa_projectlet_steps_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

ALTER TABLE ai_analyses
DROP CONSTRAINT IF EXISTS ai_analyses_form_id_fkey;

ALTER TABLE ai_analyses
ADD CONSTRAINT ai_analyses_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE CASCADE;

-- Output summary
SELECT 
    'Forms migrated:' as status,
    COUNT(*) as count
FROM aloa_forms;

SELECT 
    'Form fields migrated:' as status,
    COUNT(*) as count
FROM aloa_form_fields;

SELECT 
    'Form responses migrated:' as status,
    COUNT(*) as count
FROM aloa_form_responses;

-- Show the specific form that was being selected
SELECT 
    'Form 7f1301eb-3526-4064-bf1e-842966e2a2e1 status:' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM aloa_forms WHERE id = '7f1301eb-3526-4064-bf1e-842966e2a2e1')
        THEN 'Successfully migrated'
        ELSE 'Not found - may need manual migration'
    END as result;