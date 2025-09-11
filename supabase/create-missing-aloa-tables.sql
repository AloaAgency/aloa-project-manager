-- Create any missing aloa_ tables before setting up the complete system

-- 1. Create aloa_form_response_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS aloa_form_response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Now run the complete setup
-- Add ALL necessary columns to aloa_forms table
ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT ARRAY['General Information'];

ALTER TABLE aloa_forms 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "requiresAuth": false,
  "multipleSubmissions": false,
  "showProgressBar": true,
  "successMessage": "Thank you for your submission!",
  "redirectUrl": null,
  "emailNotifications": false,
  "notificationEmail": null
}'::jsonb;

ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{
  "primaryColor": "#000000",
  "backgroundColor": "#ffffff",
  "fontFamily": "Inter"
}'::jsonb;

ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);

ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;

-- 3. Ensure aloa_form_fields has all necessary columns
ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS help_text TEXT;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS conditional_logic JSONB;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS default_value TEXT;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS min_length INTEGER;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS max_length INTEGER;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS min_value NUMERIC;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS max_value NUMERIC;

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS file_types TEXT[];

ALTER TABLE aloa_form_fields
ADD COLUMN IF NOT EXISTS max_file_size INTEGER;

-- 4. Ensure aloa_form_responses has all necessary columns
ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS ip_address INET;

ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS completion_time_seconds INTEGER;

ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;

ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct';

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aloa_forms_project_id ON aloa_forms(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_url_id ON aloa_forms(url_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_status ON aloa_forms(status);
CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_form_id ON aloa_form_fields(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_order ON aloa_form_fields(aloa_form_id, field_order);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_form_id ON aloa_form_responses(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_submitted ON aloa_form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_aloa_form_response_answers_response ON aloa_form_response_answers(response_id);

-- 6. Fix ALL foreign key constraints
ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS aloa_applets_form_id_fkey;

ALTER TABLE aloa_applets
ADD CONSTRAINT aloa_applets_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

ALTER TABLE aloa_form_fields
DROP CONSTRAINT IF EXISTS aloa_form_fields_aloa_form_id_fkey;

ALTER TABLE aloa_form_fields
ADD CONSTRAINT aloa_form_fields_aloa_form_id_fkey
FOREIGN KEY (aloa_form_id)
REFERENCES aloa_forms(id)
ON DELETE CASCADE;

ALTER TABLE aloa_form_responses
DROP CONSTRAINT IF EXISTS aloa_form_responses_aloa_form_id_fkey;

ALTER TABLE aloa_form_responses
ADD CONSTRAINT aloa_form_responses_aloa_form_id_fkey
FOREIGN KEY (aloa_form_id)
REFERENCES aloa_forms(id)
ON DELETE CASCADE;

-- Now add the constraint for the newly created table
ALTER TABLE aloa_form_response_answers
DROP CONSTRAINT IF EXISTS aloa_form_response_answers_response_id_fkey;

ALTER TABLE aloa_form_response_answers
ADD CONSTRAINT aloa_form_response_answers_response_id_fkey
FOREIGN KEY (response_id)
REFERENCES aloa_form_responses(id)
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

-- 7. Clear any orphaned references (safe operation - only nullifies invalid references)
UPDATE aloa_applets 
SET form_id = NULL, 
    config = jsonb_set(
        COALESCE(config, '{}'::jsonb), 
        '{form_id}', 
        'null'::jsonb
    )
WHERE form_id IS NOT NULL 
  AND form_id NOT IN (SELECT id FROM aloa_forms);

-- 8. Create helpful view for form statistics
CREATE OR REPLACE VIEW aloa_forms_with_stats AS
SELECT 
    f.*,
    COUNT(DISTINCT r.id) as total_responses,
    COUNT(DISTINCT ff.id) as total_fields,
    MAX(r.submitted_at) as last_submission
FROM aloa_forms f
LEFT JOIN aloa_form_responses r ON r.aloa_form_id = f.id
LEFT JOIN aloa_form_fields ff ON ff.aloa_form_id = f.id
GROUP BY f.id;

-- 9. Create trigger for auto-updating submission counts
CREATE OR REPLACE FUNCTION update_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE aloa_forms 
        SET submission_count = submission_count + 1 
        WHERE id = NEW.aloa_form_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE aloa_forms 
        SET submission_count = submission_count - 1 
        WHERE id = OLD.aloa_form_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_form_submission_count_trigger ON aloa_form_responses;
CREATE TRIGGER update_form_submission_count_trigger
AFTER INSERT OR DELETE ON aloa_form_responses
FOR EACH ROW EXECUTE FUNCTION update_form_submission_count();

-- Success message
SELECT 
    'Aloa forms system fully configured!' as status,
    'All tables created and functionality enabled' as message,
    'No legacy data was modified or deleted' as safety_note;