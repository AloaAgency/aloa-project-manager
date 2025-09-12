-- Create aloa_project_timeline table
-- This table stores timeline events and activity logs for projects

CREATE TABLE IF NOT EXISTS aloa_project_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON aloa_project_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON aloa_project_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_created_by ON aloa_project_timeline(created_by);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON aloa_project_timeline(created_at DESC);

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
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
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
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE aloa_project_timeline IS 'Timeline of events and activities for projects';
COMMENT ON COLUMN aloa_project_timeline.project_id IS 'The project this event belongs to';
COMMENT ON COLUMN aloa_project_timeline.event_type IS 'Type of event (e.g., user_assigned, user_removed, milestone_reached, etc.)';
COMMENT ON COLUMN aloa_project_timeline.description IS 'Human-readable description of the event';
COMMENT ON COLUMN aloa_project_timeline.created_by IS 'User who triggered this event';
COMMENT ON COLUMN aloa_project_timeline.metadata IS 'Additional data about the event in JSON format';