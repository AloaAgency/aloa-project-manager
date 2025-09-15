-- Diagnostic script to identify RLS policy issues for aloa_project_members

-- 1. Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'aloa_project_members';

-- 2. List all current policies with their definitions
SELECT
    policyname,
    cmd,
    qual,
    with_check,
    roles
FROM pg_policies
WHERE tablename = 'aloa_project_members'
ORDER BY policyname;

-- 3. Test a simple insert without RLS (temporarily disable to test)
-- First, disable RLS temporarily
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;

-- Try the insert (you'll need to replace these IDs with actual values)
-- This is just to verify the table structure is correct
-- DO NOT RUN THIS PART - just for reference
-- INSERT INTO aloa_project_members (project_id, user_id, project_role)
-- VALUES ('your-project-id', 'your-user-id', 'team_member');

-- Re-enable RLS
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- 4. Create the SIMPLEST possible policy - allow all authenticated users everything
-- This is for testing only - we'll make it more restrictive once it works
DROP POLICY IF EXISTS "temporary_allow_all" ON aloa_project_members;

CREATE POLICY "temporary_allow_all"
ON aloa_project_members
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Verify the new policy was created
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'aloa_project_members'
AND policyname = 'temporary_allow_all';

-- IMPORTANT: After testing, you should run a more restrictive policy!
-- This temporary policy allows all authenticated users to do everything.