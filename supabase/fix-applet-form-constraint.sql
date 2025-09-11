-- Fix the aloa_applets table foreign key constraint to point to aloa_forms instead of legacy forms table

-- First, drop the existing foreign key constraint that points to the legacy forms table
ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS aloa_applets_form_id_fkey;

-- Add a new foreign key constraint that points to aloa_forms
ALTER TABLE aloa_applets
ADD CONSTRAINT aloa_applets_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

-- Also ensure the aloa_form_fields table has the correct foreign key
ALTER TABLE aloa_form_fields
DROP CONSTRAINT IF EXISTS aloa_form_fields_aloa_form_id_fkey;

ALTER TABLE aloa_form_fields
ADD CONSTRAINT aloa_form_fields_aloa_form_id_fkey
FOREIGN KEY (aloa_form_id)
REFERENCES aloa_forms(id)
ON DELETE CASCADE;

-- Fix aloa_projectlet_steps table foreign key if it exists
ALTER TABLE aloa_projectlet_steps
DROP CONSTRAINT IF EXISTS aloa_projectlet_steps_form_id_fkey;

ALTER TABLE aloa_projectlet_steps
ADD CONSTRAINT aloa_projectlet_steps_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

-- Fix ai_analyses table foreign key if it exists
ALTER TABLE ai_analyses
DROP CONSTRAINT IF EXISTS ai_analyses_form_id_fkey;

ALTER TABLE ai_analyses
ADD CONSTRAINT ai_analyses_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE CASCADE;

-- Make sure the relationship is properly set up for Supabase to recognize it
COMMENT ON CONSTRAINT aloa_form_fields_aloa_form_id_fkey ON aloa_form_fields IS 
'@foreignKey (aloa_form_id) references aloa_forms (id)|@fieldName aloaFormFields';