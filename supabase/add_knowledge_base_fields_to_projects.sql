-- Add knowledge base fields to aloa_projects table
-- These fields are used to store project-specific knowledge base information

-- Add existing_url column (for the client's current website URL)
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS existing_url TEXT;

-- Add google_drive_url column (for Google Drive folder with project assets)
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS google_drive_url TEXT;

-- Add base_knowledge column (for storing base project knowledge/notes)
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS base_knowledge TEXT;

-- Add ai_context column if it doesn't exist (for AI-generated context)
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS ai_context TEXT;

-- Add knowledge_updated_at column to track when knowledge was last updated
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS knowledge_updated_at TIMESTAMP WITH TIME ZONE;

-- Create an index on the existing_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_aloa_projects_existing_url
ON aloa_projects (existing_url)
WHERE existing_url IS NOT NULL;

-- Add a comment to document these fields
COMMENT ON COLUMN aloa_projects.existing_url IS 'The client''s current/existing website URL';
COMMENT ON COLUMN aloa_projects.google_drive_url IS 'Google Drive folder URL containing project assets and documents';
COMMENT ON COLUMN aloa_projects.base_knowledge IS 'Base knowledge and notes about the project for AI context';
COMMENT ON COLUMN aloa_projects.ai_context IS 'AI-generated context summary from all project knowledge';
COMMENT ON COLUMN aloa_projects.knowledge_updated_at IS 'Timestamp of last knowledge base update';