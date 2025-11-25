-- Add public forms support
-- This allows forms to be shared publicly via link without requiring authentication

-- 1. Add is_public column to aloa_forms
ALTER TABLE aloa_forms
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Add index for public forms queries
CREATE INDEX IF NOT EXISTS idx_aloa_forms_is_public ON aloa_forms(is_public) WHERE is_public = true;

-- 3. Add RLS policies for anonymous access to public forms
-- Allow anyone (including anonymous) to view public forms
CREATE POLICY "Public forms are viewable by anyone" ON aloa_forms
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND status = 'active');

-- Allow anonymous to view fields of public forms
CREATE POLICY "Public form fields are viewable by anyone" ON aloa_form_fields
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_fields.aloa_form_id
        AND f.is_public = true
        AND f.status = 'active'
    )
  );

-- Allow anonymous to submit responses to public forms
CREATE POLICY "Anyone can submit to public forms" ON aloa_form_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_responses.aloa_form_id
        AND f.is_public = true
        AND f.status = 'active'
    )
  );

-- Allow anonymous to insert response answers for public form submissions
CREATE POLICY "Anyone can submit answers to public forms" ON aloa_form_response_answers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_form_responses r
      JOIN aloa_forms f ON f.id = r.aloa_form_id
      WHERE r.id = aloa_form_response_answers.response_id
        AND f.is_public = true
        AND f.status = 'active'
    )
  );

-- 4. Comment for documentation
COMMENT ON COLUMN aloa_forms.is_public IS 'When true, the form can be accessed and submitted by anyone with the link (no authentication required). Public forms should have noindex meta tags.';

DO $$
BEGIN
  RAISE NOTICE 'Public forms support added successfully.';
END $$;
