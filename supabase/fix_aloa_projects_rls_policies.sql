-- Fix RLS policies for aloa_projects table to ensure immediate visibility
-- Run this in Supabase SQL editor to fix project visibility issues

-- First, check if RLS is enabled on the aloa_projects table
DO $$
BEGIN
    -- Disable RLS temporarily if it's causing issues
    ALTER TABLE aloa_projects DISABLE ROW LEVEL SECURITY;

    RAISE NOTICE 'RLS disabled on aloa_projects table for unrestricted access';

    -- Note: If you want to re-enable RLS with proper policies later,
    -- you'll need to create appropriate policies for:
    -- 1. Service role (full access)
    -- 2. Authenticated users based on their role in aloa_user_profiles
    -- 3. Clients based on their presence in aloa_project_team or aloa_project_members
END $$;

-- Alternatively, if you want to keep RLS enabled but fix the policies:
-- Uncomment the following section instead of the above

/*
-- Enable RLS on aloa_projects
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role has full access to projects" ON aloa_projects;
DROP POLICY IF EXISTS "Users can view all projects" ON aloa_projects;
DROP POLICY IF EXISTS "Users can manage projects" ON aloa_projects;

-- Create a policy that allows the service role full access
CREATE POLICY "Service role has full access to projects"
ON aloa_projects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a policy that allows authenticated users to view all projects
-- This ensures admins can see all projects immediately
CREATE POLICY "Authenticated users can view all projects"
ON aloa_projects
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows authenticated users to insert/update/delete projects
CREATE POLICY "Authenticated users can manage projects"
ON aloa_projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: In production, you might want more restrictive policies:
-- - Only admins/super_admins can see all projects
-- - Clients only see their assigned projects
-- - Team members only see projects they're assigned to
*/

-- Verify the current state
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'aloa_projects';

-- Check if there are any policies on the table
SELECT
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polroles::regrole[] as roles,
    CASE
        WHEN pol.polpermissive THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END as type,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'aloa_projects';