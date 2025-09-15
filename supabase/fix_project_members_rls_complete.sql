-- Comprehensive fix for aloa_project_members RLS policies
-- This completely removes and recreates all policies to avoid recursion

-- First, disable RLS temporarily to clear everything
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the table
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'aloa_project_members'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON aloa_project_members', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- Create new, simple policies without recursion

-- Policy 1: All authenticated users can view project members
-- This is a simple policy that doesn't check membership
CREATE POLICY "anyone_can_view_members"
ON aloa_project_members
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Super admins can do everything
CREATE POLICY "super_admins_all_access"
ON aloa_project_members
FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM aloa_user_profiles
        WHERE role = 'super_admin'
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM aloa_user_profiles
        WHERE role = 'super_admin'
    )
);

-- Policy 3: Project admins can manage members
CREATE POLICY "project_admins_can_manage"
ON aloa_project_members
FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT id FROM aloa_user_profiles
        WHERE role = 'project_admin'
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM aloa_user_profiles
        WHERE role = 'project_admin'
    )
);

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'aloa_project_members'
ORDER BY policyname;