-- Fresh start for aloa_forms - no migration, just fix structure and constraints

-- Add missing columns to aloa_forms for better functionality
ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT ARRAY['General Information'];

ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "requiresAuth": false,
  "multipleSubmissions": false,
  "showProgressBar": true
}'::jsonb;

-- Fix the foreign key constraints to point to aloa_forms instead of legacy forms
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

-- Clear any orphaned form references in aloa_applets since we're starting fresh
UPDATE aloa_applets 
SET form_id = NULL, 
    config = jsonb_set(
        COALESCE(config, '{}'::jsonb), 
        '{form_id}', 
        'null'::jsonb
    )
WHERE form_id IS NOT NULL 
  AND form_id NOT IN (SELECT id FROM aloa_forms);

-- Success message
SELECT 'Aloa forms system ready for fresh start!' as status,
       'All constraints fixed and columns added' as message;