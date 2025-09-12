-- Create user_invitations table for managing user invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'client')),
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  custom_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_at ON user_invitations(accepted_at);

-- Add RLS policies (disabled by default, enable if needed)
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all invitations
CREATE POLICY "Super admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: Project admins can view invitations for their projects
CREATE POLICY "Project admins can view project invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.user_id = auth.uid()
      AND aloa_project_team.project_id = user_invitations.project_id
      AND aloa_project_team.role = 'project_admin'
    )
  );

-- Policy: Anyone with a valid token can view their invitation
CREATE POLICY "Users can view their own invitation" ON user_invitations
  FOR SELECT
  USING (true); -- Token validation happens in the application layer

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE user_invitations IS 'Stores user invitations with expiration and acceptance tracking';
COMMENT ON COLUMN user_invitations.token IS 'Unique token for invitation URL';
COMMENT ON COLUMN user_invitations.expires_at IS 'When the invitation expires (typically 7 days)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted (null if pending)';