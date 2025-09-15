-- Fix RLS policies to allow inserts for aloa_project_members

-- Drop all existing policies first
DROP POLICY IF EXISTS "anyone_can_view_members" ON aloa_project_members;
DROP POLICY IF EXISTS "super_admins_all_access" ON aloa_project_members;
DROP POLICY IF EXISTS "project_admins_can_manage" ON aloa_project_members;

-- Create a simpler, more permissive policy structure

-- 1. Anyone authenticated can view members
CREATE POLICY "view_project_members"
ON aloa_project_members
FOR SELECT
TO authenticated
USING (true);

-- 2. Authenticated users with admin roles can insert/update/delete
-- Using a simpler check that won't cause recursion
CREATE POLICY "admin_manage_members"
ON aloa_project_members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE aloa_user_profiles.id = auth.uid()
        AND aloa_user_profiles.role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE aloa_user_profiles.id = auth.uid()
        AND aloa_user_profiles.role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Verify the policies
SELECT
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'aloa_project_members'
ORDER BY policyname;