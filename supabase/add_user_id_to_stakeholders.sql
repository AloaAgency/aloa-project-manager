-- Add user_id column to aloa_client_stakeholders table
-- This links stakeholders to actual user accounts in the system

-- Add the user_id column if it doesn't exist
ALTER TABLE aloa_client_stakeholders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_user_id 
ON aloa_client_stakeholders(user_id);

-- Add a comment to document the column purpose
COMMENT ON COLUMN aloa_client_stakeholders.user_id IS 'Links the stakeholder to a user account in auth.users table';