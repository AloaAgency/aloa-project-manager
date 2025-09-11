-- Create table for client stakeholders
-- Stores information about key stakeholders for each project

CREATE TABLE IF NOT EXISTS aloa_client_stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  role VARCHAR(100), -- e.g., 'decision_maker', 'influencer', 'end_user', 'technical_lead'
  email VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT, -- Biography or detailed description
  responsibilities TEXT, -- Key responsibilities in the project
  preferences TEXT, -- Communication preferences, working style, etc.
  avatar_url TEXT, -- URL to profile image
  linkedin_url TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10), -- 1-10 scale
  is_primary BOOLEAN DEFAULT false, -- Primary contact
  metadata JSONB DEFAULT '{}', -- Additional flexible data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_project_id 
ON aloa_client_stakeholders(project_id);

CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_importance 
ON aloa_client_stakeholders(project_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_is_primary 
ON aloa_client_stakeholders(project_id, is_primary);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_aloa_client_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aloa_client_stakeholders_updated_at
BEFORE UPDATE ON aloa_client_stakeholders
FOR EACH ROW
EXECUTE FUNCTION update_aloa_client_stakeholders_updated_at();

-- Add comment for documentation
COMMENT ON TABLE aloa_client_stakeholders IS 'Stores client stakeholder information for projects, including their roles, contact details, and biographical information that can be referenced by AI for project context';