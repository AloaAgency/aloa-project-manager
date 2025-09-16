-- Fix infinite recursion in aloa_project_members RLS policies
-- The issue is likely that the policy is checking itself in a circular way

-- First, drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "View project members" ON aloa_project_members;
DROP POLICY IF EXISTS "Manage project members" ON aloa_project_members;
DROP POLICY IF EXISTS "Users can view project members" ON aloa_project_members;
DROP POLICY IF EXISTS "Admins can manage project members" ON aloa_project_members;

-- Enable RLS on the table if not already enabled
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- Create simpler, non-recursive policies

-- Policy 1: Anyone can view project members (simplified for now)
CREATE POLICY "View project members"
ON aloa_project_members
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Super admins and project admins can insert/update/delete
CREATE POLICY "Manage project members"
ON aloa_project_members
FOR ALL
TO authenticated
USING (
  -- Check if user is super_admin or project_admin
  EXISTS (
    SELECT 1
    FROM aloa_user_profiles
    WHERE aloa_user_profiles.id = auth.uid()
    AND aloa_user_profiles.role IN ('super_admin', 'project_admin')
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON aloa_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON aloa_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_role ON aloa_project_members(project_role);