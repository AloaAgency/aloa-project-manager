-- Fix aloa_project_timeline table - add missing columns if table exists
-- Or create the table if it doesn't exist

-- First, try to create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS aloa_project_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already exists, add missing columns
ALTER TABLE aloa_project_timeline 
ADD COLUMN IF NOT EXISTS projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE;

ALTER TABLE aloa_project_timeline 
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE aloa_project_timeline 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE aloa_project_timeline 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON aloa_project_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_projectlet_id ON aloa_project_timeline(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON aloa_project_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_user_id ON aloa_project_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON aloa_project_timeline(created_at DESC);

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view project timeline" ON aloa_project_timeline;
DROP POLICY IF EXISTS "Team members can add timeline events" ON aloa_project_timeline;

-- Enable RLS (Row Level Security)
ALTER TABLE aloa_project_timeline ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view timeline for projects they're involved in
CREATE POLICY "Users can view project timeline" ON aloa_project_timeline
  FOR SELECT
  USING (
    -- User is a stakeholder in this project
    EXISTS (
      SELECT 1 FROM aloa_project_stakeholders
      WHERE aloa_project_stakeholders.project_id = aloa_project_timeline.project_id
      AND aloa_project_stakeholders.user_id = auth.uid()
    )
    OR
    -- User is a team member of this project
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.project_id = aloa_project_timeline.project_id
      AND aloa_project_team.user_id = auth.uid()
    )
    OR
    -- User is a super admin
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  );

-- Policy: Team members can add timeline events
CREATE POLICY "Team members can add timeline events" ON aloa_project_timeline
  FOR INSERT
  WITH CHECK (
    -- User is a team member of this project
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.project_id = aloa_project_timeline.project_id
      AND aloa_project_team.user_id = auth.uid()
    )
    OR
    -- User is a super admin
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  );

-- Add comments for documentation (these will update if they already exist)
COMMENT ON TABLE aloa_project_timeline IS 'Timeline of events and activities for projects';
COMMENT ON COLUMN aloa_project_timeline.project_id IS 'The project this event belongs to';
COMMENT ON COLUMN aloa_project_timeline.event_type IS 'Type of event (e.g., user_assigned, user_removed, milestone_reached, etc.)';
COMMENT ON COLUMN aloa_project_timeline.description IS 'Human-readable description of the event';
COMMENT ON COLUMN aloa_project_timeline.user_id IS 'User who triggered this event';
COMMENT ON COLUMN aloa_project_timeline.metadata IS 'Additional data about the event in JSON format';
