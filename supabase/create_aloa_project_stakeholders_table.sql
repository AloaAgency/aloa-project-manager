-- Create aloa_project_stakeholders table
-- This table stores external stakeholders (clients, etc.) for projects

CREATE TABLE IF NOT EXISTS aloa_project_stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'stakeholder', 'viewer')),
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_id ON aloa_project_stakeholders(user_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON aloa_project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_project ON aloa_project_stakeholders(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON aloa_project_stakeholders(role);

-- Enable RLS (Row Level Security)
ALTER TABLE aloa_project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view stakeholders for projects they're involved in
CREATE POLICY "Users can view project stakeholders" ON aloa_project_stakeholders
  FOR SELECT
  USING (
    -- User is a stakeholder in this project
    user_id = auth.uid()
    OR
    -- User is a team member of this project
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.project_id = aloa_project_stakeholders.project_id
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

-- Policy: Project admins and super admins can manage stakeholders
CREATE POLICY "Admins can manage stakeholders" ON aloa_project_stakeholders
  FOR ALL
  USING (
    -- User is a super admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR
    -- User is a project admin for this project
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.project_id = aloa_project_stakeholders.project_id
      AND aloa_project_team.user_id = auth.uid()
      AND aloa_project_team.role = 'project_admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_aloa_project_stakeholders_updated_at
  BEFORE UPDATE ON aloa_project_stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE aloa_project_stakeholders IS 'External stakeholders (clients, viewers) associated with projects';
COMMENT ON COLUMN aloa_project_stakeholders.project_id IS 'The project this stakeholder is associated with';
COMMENT ON COLUMN aloa_project_stakeholders.user_id IS 'The user who is a stakeholder';
COMMENT ON COLUMN aloa_project_stakeholders.role IS 'The stakeholder role: client (primary client), stakeholder (other interested party), viewer (read-only access)';
COMMENT ON COLUMN aloa_project_stakeholders.added_by IS 'The user who added this stakeholder to the project';