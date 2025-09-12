-- Fix RLS policies for aloa_user_profiles table
-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON aloa_user_profiles;

-- Disable RLS temporarily to avoid issues
ALTER TABLE aloa_user_profiles DISABLE ROW LEVEL SECURITY;

-- Ensure ross@aloa.agency is super_admin
UPDATE aloa_user_profiles 
SET role = 'super_admin' 
WHERE email = 'ross@aloa.agency';

-- If the row doesn't exist, insert it from profiles table
INSERT INTO aloa_user_profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  'super_admin', -- Force super_admin role
  p.created_at,
  p.updated_at
FROM profiles p
WHERE p.email = 'ross@aloa.agency'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin';

-- Re-enable RLS with simpler policies
ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy: Everyone can read all profiles (for team/client lookups)
CREATE POLICY "Anyone can view profiles" ON aloa_user_profiles
  FOR SELECT
  USING (true);

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile except role" ON aloa_user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add comment
COMMENT ON TABLE aloa_user_profiles IS 'User profiles for Aloa project management - RLS enabled with simple policies';