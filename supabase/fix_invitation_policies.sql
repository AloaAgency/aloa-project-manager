-- Fix RLS policies for user_invitations table to allow authorized users to insert

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Project admins can insert invitations" ON user_invitations;

-- Allow super admins to insert invitations
CREATE POLICY "Super admins can insert invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  );

-- Allow project admins to insert invitations for their projects
CREATE POLICY "Project admins can insert invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.user_id = auth.uid()
      AND aloa_project_team.project_id = user_invitations.project_id
      AND aloa_project_team.role = 'project_admin'
    )
    OR
    -- Or if they're a project admin inviting to any project (for clients)
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'project_admin'
      AND user_invitations.role = 'client'
    )
  );

-- Also ensure super admins can do everything with invitations
DROP POLICY IF EXISTS "Super admins have full access" ON user_invitations;
CREATE POLICY "Super admins have full access" ON user_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  );

SELECT 'Invitation policies updated successfully' as status;