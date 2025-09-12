-- Fix aloa_project_stakeholders table structure
-- Ensure all required columns exist

-- Add user_id column if it doesn't exist
ALTER TABLE aloa_project_stakeholders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add project_id column if it doesn't exist
ALTER TABLE aloa_project_stakeholders
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE;

-- Add role column if it doesn't exist
ALTER TABLE aloa_project_stakeholders
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' 
CHECK (role IN ('client', 'stakeholder', 'viewer'));

-- Add added_by column to track who added the stakeholder
ALTER TABLE aloa_project_stakeholders
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES profiles(id);

-- Add timestamps if they don't exist
ALTER TABLE aloa_project_stakeholders
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_id ON aloa_project_stakeholders(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON aloa_project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_project ON aloa_project_stakeholders(user_id, project_id);

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE aloa_project_stakeholders
DROP CONSTRAINT IF EXISTS unique_user_project_stakeholder;
ALTER TABLE aloa_project_stakeholders
ADD CONSTRAINT unique_user_project_stakeholder UNIQUE (user_id, project_id);

-- Add comment for documentation
COMMENT ON TABLE aloa_project_stakeholders IS 'Project stakeholders (clients and other external users)';
COMMENT ON COLUMN aloa_project_stakeholders.user_id IS 'Reference to user in profiles table';
COMMENT ON COLUMN aloa_project_stakeholders.project_id IS 'Reference to project in aloa_projects table';
COMMENT ON COLUMN aloa_project_stakeholders.role IS 'Stakeholder role: client, stakeholder, or viewer';
COMMENT ON COLUMN aloa_project_stakeholders.added_by IS 'User who added this stakeholder';