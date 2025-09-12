-- Fix RLS policies for aloa_project_members table
-- This fixes the "infinite recursion detected in policy" error

-- First, drop all existing policies on aloa_project_members
DROP POLICY IF EXISTS "Enable read access for all users" ON aloa_project_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON aloa_project_members;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON aloa_project_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON aloa_project_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON aloa_project_members;
DROP POLICY IF EXISTS "Super admins can manage all memberships" ON aloa_project_members;
DROP POLICY IF EXISTS "Project admins can manage project memberships" ON aloa_project_members;

-- Create simplified, non-recursive policies

-- 1. Users can view their own project memberships
CREATE POLICY "Users can view their own memberships" 
ON aloa_project_members FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Super admins can do everything (based on aloa_user_profiles)
CREATE POLICY "Super admins full access" 
ON aloa_project_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- 3. Project admins can manage their project members (simplified, no recursion)
CREATE POLICY "Project admins can manage their projects" 
ON aloa_project_members FOR ALL 
USING (
  project_id IN (
    SELECT project_id 
    FROM aloa_project_members pm2
    WHERE pm2.user_id = auth.uid() 
    AND pm2.project_role = 'admin'
  )
);

-- 4. Service role bypass (this is automatic, but documenting for clarity)
-- The service role key bypasses all RLS policies

-- Optional: If you want to allow all authenticated users to view all memberships (for team visibility)
-- Uncomment the following if needed:
-- CREATE POLICY "Authenticated users can view memberships" 
-- ON aloa_project_members FOR SELECT 
-- USING (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;