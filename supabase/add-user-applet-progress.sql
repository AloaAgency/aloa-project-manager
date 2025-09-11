-- Add user-specific applet progress tracking
-- This allows tracking individual client progress on applets

-- Create a table to track user-specific applet progress
CREATE TABLE IF NOT EXISTS aloa_applet_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applet_id UUID NOT NULL REFERENCES aloa_applets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  user_id TEXT, -- Can be email, session ID, or authenticated user ID
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'approved', 'revision_needed')) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  form_progress JSONB, -- Store partial form responses for resuming
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one progress record per user per applet
  UNIQUE(applet_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_applet_progress_applet_id ON aloa_applet_progress(applet_id);
CREATE INDEX idx_applet_progress_project_id ON aloa_applet_progress(project_id);
CREATE INDEX idx_applet_progress_user_id ON aloa_applet_progress(user_id);
CREATE INDEX idx_applet_progress_status ON aloa_applet_progress(status);

-- Add completed_at column to aloa_applets if it doesn't exist
-- This will track the default/admin view of completion
ALTER TABLE aloa_applets 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add a view to easily get user-specific applet status
CREATE OR REPLACE VIEW aloa_applet_with_user_progress AS
SELECT 
  a.*,
  ap.user_id,
  COALESCE(ap.status, 'not_started') as user_status,
  COALESCE(ap.completion_percentage, 0) as user_completion_percentage,
  ap.started_at as user_started_at,
  ap.completed_at as user_completed_at,
  ap.form_progress as user_form_progress
FROM aloa_applets a
LEFT JOIN aloa_applet_progress ap ON a.id = ap.applet_id;

-- Function to update applet progress
CREATE OR REPLACE FUNCTION update_applet_progress(
  p_applet_id UUID,
  p_user_id TEXT,
  p_project_id UUID,
  p_status TEXT,
  p_completion_percentage INTEGER DEFAULT NULL,
  p_form_progress JSONB DEFAULT NULL
)
RETURNS aloa_applet_progress AS $$
DECLARE
  v_progress aloa_applet_progress;
BEGIN
  INSERT INTO aloa_applet_progress (
    applet_id,
    user_id,
    project_id,
    status,
    completion_percentage,
    started_at,
    completed_at,
    last_accessed_at,
    form_progress
  ) VALUES (
    p_applet_id,
    p_user_id,
    p_project_id,
    p_status,
    COALESCE(p_completion_percentage, CASE WHEN p_status = 'completed' THEN 100 ELSE 0 END),
    CASE WHEN p_status = 'in_progress' THEN NOW() ELSE NULL END,
    CASE WHEN p_status IN ('completed', 'approved') THEN NOW() ELSE NULL END,
    NOW(),
    p_form_progress
  )
  ON CONFLICT (applet_id, user_id) 
  DO UPDATE SET
    status = p_status,
    completion_percentage = COALESCE(p_completion_percentage, aloa_applet_progress.completion_percentage),
    started_at = CASE 
      WHEN aloa_applet_progress.started_at IS NULL AND p_status = 'in_progress' 
      THEN NOW() 
      ELSE aloa_applet_progress.started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'approved') 
      THEN NOW() 
      ELSE aloa_applet_progress.completed_at 
    END,
    last_accessed_at = NOW(),
    form_progress = COALESCE(p_form_progress, aloa_applet_progress.form_progress),
    updated_at = NOW()
  RETURNING * INTO v_progress;
  
  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your auth setup)
GRANT ALL ON aloa_applet_progress TO authenticated;
GRANT ALL ON aloa_applet_progress TO anon;
GRANT SELECT ON aloa_applet_with_user_progress TO authenticated;
GRANT SELECT ON aloa_applet_with_user_progress TO anon;