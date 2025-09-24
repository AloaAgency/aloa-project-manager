-- Security Helper Functions
-- These functions provide centralized security checks for Row Level Security policies
-- They are marked as SECURITY DEFINER to run with the privileges of the function owner

-- Helper function to check if user is a member of a specific project
CREATE OR REPLACE FUNCTION is_project_member(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_project_members
    WHERE aloa_project_members.project_id = is_project_member.project_id
      AND aloa_project_members.user_id = is_project_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user has admin role (super_admin or project_admin)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE aloa_user_profiles.user_id = is_admin.user_id
      AND aloa_user_profiles.role IN ('super_admin', 'project_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get all project IDs that a user is a member of
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT aloa_project_members.project_id
  FROM aloa_project_members
  WHERE aloa_project_members.user_id = get_user_projects.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_projects(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION is_project_member(UUID, UUID) IS 'Checks if a user is a member of a specific project';
COMMENT ON FUNCTION is_admin(UUID) IS 'Checks if a user has admin privileges (super_admin or project_admin role)';
COMMENT ON FUNCTION get_user_projects(UUID) IS 'Returns all project IDs that a user is a member of';