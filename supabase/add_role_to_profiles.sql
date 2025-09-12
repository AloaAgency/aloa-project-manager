-- Add role column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' 
CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'client'));

-- Add index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing users based on email (optional - adjust as needed)
-- You can set specific users as super_admin here
-- Example:
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-admin-email@example.com';

-- Add comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role determining system permissions: super_admin has full access, project_admin manages projects, team_member works on projects, client views assigned projects only';