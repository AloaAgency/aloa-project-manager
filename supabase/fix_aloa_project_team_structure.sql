-- Fix aloa_project_team table structure
-- Add missing user_id column if it doesn't exist

-- First check if the column exists and add it if not
ALTER TABLE aloa_project_team 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON aloa_project_team(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON aloa_project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_project ON aloa_project_team(user_id, project_id);

-- Ensure role column exists
ALTER TABLE aloa_project_team
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'team_member' 
CHECK (role IN ('project_admin', 'team_member'));

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE aloa_project_team
ADD CONSTRAINT unique_user_project_team UNIQUE (user_id, project_id);

-- Add timestamps if they don't exist
ALTER TABLE aloa_project_team
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comment for documentation
COMMENT ON TABLE aloa_project_team IS 'Project team members with their roles';
COMMENT ON COLUMN aloa_project_team.user_id IS 'Reference to user in profiles table';
COMMENT ON COLUMN aloa_project_team.project_id IS 'Reference to project in aloa_projects table';
COMMENT ON COLUMN aloa_project_team.role IS 'Team member role: project_admin or team_member';