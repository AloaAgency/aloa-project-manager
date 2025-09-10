-- Add projectlet steps/modules system
-- This allows projectlets to contain multiple action items

-- Create projectlet steps table
CREATE TABLE IF NOT EXISTS aloa_projectlet_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projectlet_id UUID NOT NULL REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Step details
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('form', 'upload', 'link', 'approval', 'content', 'meeting', 'milestone')),
  sequence_order INTEGER NOT NULL DEFAULT 1,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  is_required BOOLEAN DEFAULT true,
  
  -- Type-specific data
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL, -- For form type
  link_url TEXT, -- For link type (e.g., Figma, staging site)
  upload_url TEXT, -- For uploaded files
  content_data JSONB, -- For content type
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT, -- Email or user ID
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_projectlet_steps_projectlet ON aloa_projectlet_steps(projectlet_id);
CREATE INDEX idx_projectlet_steps_project ON aloa_projectlet_steps(project_id);
CREATE INDEX idx_projectlet_steps_status ON aloa_projectlet_steps(status);

-- Create step comments/notes table
CREATE TABLE IF NOT EXISTS aloa_projectlet_step_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES aloa_projectlet_steps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  author_email TEXT NOT NULL,
  author_name TEXT,
  comment TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update projectlets to track step completion
ALTER TABLE aloa_projectlets 
ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_steps INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS step_completion_percentage INTEGER DEFAULT 0;

-- Function to update projectlet completion based on steps
CREATE OR REPLACE FUNCTION update_projectlet_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE aloa_projectlets
  SET 
    completed_steps = (
      SELECT COUNT(*) 
      FROM aloa_projectlet_steps 
      WHERE projectlet_id = NEW.projectlet_id 
      AND status = 'completed'
    ),
    total_steps = (
      SELECT COUNT(*) 
      FROM aloa_projectlet_steps 
      WHERE projectlet_id = NEW.projectlet_id
      AND is_required = true
    ),
    step_completion_percentage = CASE 
      WHEN (SELECT COUNT(*) FROM aloa_projectlet_steps WHERE projectlet_id = NEW.projectlet_id AND is_required = true) > 0
      THEN (
        (SELECT COUNT(*) FROM aloa_projectlet_steps WHERE projectlet_id = NEW.projectlet_id AND status = 'completed' AND is_required = true)::FLOAT / 
        (SELECT COUNT(*) FROM aloa_projectlet_steps WHERE projectlet_id = NEW.projectlet_id AND is_required = true)::FLOAT * 100
      )::INTEGER
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = NEW.projectlet_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for step updates
CREATE TRIGGER update_projectlet_on_step_change
AFTER INSERT OR UPDATE OR DELETE ON aloa_projectlet_steps
FOR EACH ROW
EXECUTE FUNCTION update_projectlet_completion();

-- Migrate existing form attachments to steps (if any)
-- Note: This migration is optional and only runs if you have existing data
-- Since aloa_project_forms doesn't have form_id column, we'll skip this for now

-- Sample data for step types metadata
COMMENT ON TABLE aloa_projectlet_steps IS 'Stores individual action items within a projectlet';
COMMENT ON COLUMN aloa_projectlet_steps.type IS 'Step types: form (client fills form), upload (team uploads files), link (share external link), approval (client approves), content (content submission), meeting (schedule meeting), milestone (achievement marker)';