-- Add importance_score to aloa_client_stakeholders table if it doesn't exist
-- This is the actual stakeholders table used by the application

-- Add importance score column (1-10 scale)
ALTER TABLE aloa_client_stakeholders
ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 5
  CHECK (importance_score >= 1 AND importance_score <= 10);

-- Add comment for documentation
COMMENT ON COLUMN aloa_client_stakeholders.importance_score IS
  'Importance weight 1-10: How much this stakeholder''s input should influence decisions (10=highest priority like CEO, 1=lowest priority)';

-- Add index for performance when ordering by importance
CREATE INDEX IF NOT EXISTS idx_client_stakeholders_importance
  ON aloa_client_stakeholders(importance_score DESC);

-- Update existing stakeholder records with sensible defaults based on role
UPDATE aloa_client_stakeholders
SET importance_score = CASE
  WHEN role IN ('CEO', 'Owner', 'Founder', 'President') THEN 10
  WHEN role IN ('CTO', 'CFO', 'COO', 'VP', 'Director', 'decision_maker') THEN 9
  WHEN role IN ('Manager', 'Lead', 'Head') THEN 7
  WHEN role IN ('influencer', 'technical_lead') THEN 6
  WHEN role IN ('Contributor', 'Developer', 'Designer') THEN 5
  WHEN role IN ('end_user', 'Assistant', 'Coordinator') THEN 3
  ELSE 5  -- Default for unspecified roles
END
WHERE importance_score IS NULL OR importance_score = 5;

-- Also ensure user_id column exists for linking to user accounts
ALTER TABLE aloa_client_stakeholders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES aloa_user_profiles(id) ON DELETE SET NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_client_stakeholders_user_id
  ON aloa_client_stakeholders(user_id);

-- Grant necessary permissions
GRANT ALL ON aloa_client_stakeholders TO authenticated;
GRANT SELECT ON aloa_client_stakeholders TO anon;